package com.opensuite.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotation;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationLink;
import org.apache.pdfbox.pdmodel.interactive.action.PDAction;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionURI;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import technology.tabula.ObjectExtractor;
import technology.tabula.Page;
import technology.tabula.PageIterator;
import technology.tabula.Table;
import technology.tabula.extractors.BasicExtractionAlgorithm;
import technology.tabula.extractors.SpreadsheetExtractionAlgorithm;
import technology.tabula.writers.CSVWriter;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ExtractionService {

    public String extractText(byte[] pdfBytes) throws IOException {
        try (PDDocument doc = PDDocument.load(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(doc);
        }
    }

    public byte[] extractImagesAsZip(byte[] pdfBytes) throws IOException {
        try (PDDocument doc = PDDocument.load(pdfBytes);
             ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {

            int imageCounter = 1;
            for (PDPage page : doc.getPages()) {
                PDResources resources = page.getResources();
                for (org.apache.pdfbox.cos.COSName name : resources.getXObjectNames()) {
                    PDXObject xObject = resources.getXObject(name);
                    if (xObject instanceof PDImageXObject) {
                        PDImageXObject image = (PDImageXObject) xObject;
                        BufferedImage bImage = image.getImage();

                        ZipEntry entry = new ZipEntry("image_" + imageCounter++ + ".png");
                        zos.putNextEntry(entry);
                        ImageIO.write(bImage, "PNG", zos);
                        zos.closeEntry();
                    }
                }
            }
            zos.finish();
            return baos.toByteArray();
        }
    }

    public byte[] extractTablesAsCsvZip(byte[] pdfBytes) throws IOException {
        try (PDDocument doc = PDDocument.load(pdfBytes);
             ObjectExtractor extractor = new ObjectExtractor(doc);
             ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {

            PageIterator pages = extractor.extract();
            BasicExtractionAlgorithm sea = new BasicExtractionAlgorithm();
            int tableCounter = 1;

            while (pages.hasNext()) {
                Page page = pages.next();
                List<Table> tables = sea.extract(page);
                
                for (Table table : tables) {
                    ZipEntry entry = new ZipEntry("table_" + tableCounter++ + ".csv");
                    zos.putNextEntry(entry);
                    
                    // Use Tabula's CSV Writer but piped to our stream wrapper via An Appendable
                    ByteArrayOutputStream csvStream = new ByteArrayOutputStream();
                    try (OutputStreamWriter writer = new OutputStreamWriter(csvStream, StandardCharsets.UTF_8)) {
                        new CSVWriter().write(writer, table);
                    }
                    
                    zos.write(csvStream.toByteArray());
                    zos.closeEntry();
                }
            }
            
            zos.finish();
            return baos.toByteArray();
        }
    }

    public List<String> extractLinks(byte[] pdfBytes) throws IOException {
        List<String> links = new ArrayList<>();
        try (PDDocument doc = PDDocument.load(pdfBytes)) {
            for (PDPage page : doc.getPages()) {
                for (PDAnnotation annotation : page.getAnnotations()) {
                    if (annotation instanceof PDAnnotationLink) {
                        PDAnnotationLink link = (PDAnnotationLink) annotation;
                        PDAction action = link.getAction();
                        if (action instanceof PDActionURI) {
                            String uri = ((PDActionURI) action).getURI();
                            if (uri != null && !uri.isEmpty()) {
                                links.add(uri);
                            }
                        }
                    }
                }
            }
        }
        return links;
    }
}
