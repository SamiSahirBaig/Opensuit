package com.opensuite.service;

import technology.tabula.ObjectExtractor;
import technology.tabula.Page;
import technology.tabula.PageIterator;
import technology.tabula.Table;
import technology.tabula.RectangularTextContainer;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.io.RandomAccessReadBuffer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotation;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationLink;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionURI;
import org.apache.pdfbox.pdmodel.interactive.action.PDAction;
import org.springframework.stereotype.Service;
import technology.tabula.extractors.SpreadsheetExtractionAlgorithm;
import technology.tabula.extractors.BasicExtractionAlgorithm;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ExtractionService {
    
    public String extractText(byte[] pdfBytes) throws IOException {
        try (PDDocument doc = Loader.loadPDF(new RandomAccessReadBuffer(pdfBytes))) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(doc);
        }
    }
    
    public Map<String, byte[]> extractImages(byte[] pdfBytes) throws IOException {
        Map<String, byte[]> images = new HashMap<>();
        try (PDDocument doc = Loader.loadPDF(new RandomAccessReadBuffer(pdfBytes))) {
            int imageIndex = 1;
            for (PDPage page : doc.getPages()) {
                PDResources resources = page.getResources();
                if (resources == null) continue;
                
                for (COSName name : resources.getXObjectNames()) {
                    PDXObject xObject = resources.getXObject(name);
                    if (xObject instanceof PDImageXObject) {
                        PDImageXObject image = (PDImageXObject) xObject;
                        BufferedImage bImage = image.getImage();
                        
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        ImageIO.write(bImage, "PNG", baos);
                        images.put("image_" + imageIndex + ".png", baos.toByteArray());
                        imageIndex++;
                    }
                }
            }
        }
        return images;
    }
    
    public String extractTablesAsCsv(byte[] pdfBytes) throws IOException {
        StringBuilder csvData = new StringBuilder();
        try (PDDocument doc = Loader.loadPDF(new RandomAccessReadBuffer(pdfBytes))) {
            ObjectExtractor extractor = new ObjectExtractor(doc);
            SpreadsheetExtractionAlgorithm sea = new SpreadsheetExtractionAlgorithm();
            PageIterator pages = extractor.extract();
            
            while (pages.hasNext()) {
                Page page = pages.next();
                List<Table> tables = sea.extract(page);
                for (Table table : tables) {
                    for (List<RectangularTextContainer> row : table.getRows()) {
                        for (int i = 0; i < row.size(); i++) {
                            String cellText = row.get(i).getText().replace("\"", "\"\"");
                            csvData.append("\"").append(cellText).append("\"");
                            if (i < row.size() - 1) csvData.append(",");
                        }
                        csvData.append("\n");
                    }
                    csvData.append("\n---\n"); // Table separator
                }
            }
            extractor.close();
        }
        return csvData.toString();
    }
    
    public List<String> extractLinks(byte[] pdfBytes) throws IOException {
        List<String> links = new ArrayList<>();
        try (PDDocument doc = Loader.loadPDF(new RandomAccessReadBuffer(pdfBytes))) {
            for (PDPage page : doc.getPages()) {
                for (PDAnnotation annotation : page.getAnnotations()) {
                    if (annotation instanceof PDAnnotationLink) {
                        PDAnnotationLink link = (PDAnnotationLink) annotation;
                        PDAction action = link.getAction();
                        if (action instanceof PDActionURI) {
                            links.add(((PDActionURI) action).getURI());
                        }
                    }
                }
            }
        }
        return links;
    }

    public byte[] extractAllAsZip(byte[] pdfBytes, boolean extractText, boolean extractImages, boolean extractTables, boolean extractLinks) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            
            if (extractText) {
                String text = extractText(pdfBytes);
                zos.putNextEntry(new ZipEntry("extracted_text.txt"));
                zos.write(text.getBytes());
                zos.closeEntry();
            }

            if (extractImages) {
                Map<String, byte[]> images = extractImages(pdfBytes);
                for (Map.Entry<String, byte[]> entry : images.entrySet()) {
                    zos.putNextEntry(new ZipEntry("images/" + entry.getKey()));
                    zos.write(entry.getValue());
                    zos.closeEntry();
                }
            }

            if (extractTables) {
                String csv = extractTablesAsCsv(pdfBytes);
                if (!csv.isEmpty()) {
                    zos.putNextEntry(new ZipEntry("extracted_tables.csv"));
                    zos.write(csv.getBytes());
                    zos.closeEntry();
                }
            }

            if (extractLinks) {
                List<String> links = extractLinks(pdfBytes);
                if (!links.isEmpty()) {
                    zos.putNextEntry(new ZipEntry("extracted_links.txt"));
                    zos.write(String.join("\n", links).getBytes());
                    zos.closeEntry();
                }
            }
        }
        return baos.toByteArray();
    }
}
