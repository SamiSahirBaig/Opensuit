package com.opensuite.service;

import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatCompletionResult;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.service.OpenAiService;
import com.google.cloud.translate.Translate;
import com.google.cloud.translate.TranslateOptions;
import com.google.cloud.translate.Translation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AIService {
    private OpenAiService openAiService;
    private Translate translate;
    
    public AIService(
            @Value("${openai.api.key:}") String openAiKey,
            @Value("${google.cloud.api.key:}") String googleKey) {
        if (openAiKey != null && !openAiKey.isEmpty()) {
            this.openAiService = new OpenAiService(openAiKey);
        }
        if (googleKey != null && !googleKey.isEmpty()) {
            this.translate = TranslateOptions.newBuilder().setApiKey(googleKey).build().getService();
        }
    }
    
    public String summarizePDF(String pdfText, String lengthStr, String format) {
        if (openAiService == null) {
            return "[MOCK AI] Summarizer API key not configured. Word count of source: " + pdfText.split("\\s+").length + "\n\n1. Key point extracted.\n2. Formatted successfully.";
        }

        int maxTokens = 500;
        int wordCount = 100;
        
        switch(lengthStr != null ? lengthStr.toLowerCase() : "medium") {
            case "short": wordCount = 100; maxTokens = 150; break;
            case "long": wordCount = 500; maxTokens = 800; break;
            case "medium":
            default: wordCount = 300; maxTokens = 400; break;
        }

        String prompt = String.format(
            "Summarize the following document in about %d words. Format as %s:\n\n%s",
            wordCount,
            format != null ? format : "paragraph",
            pdfText.length() > 15000 ? pdfText.substring(0, 15000) : pdfText
        );
        
        ChatCompletionRequest request = ChatCompletionRequest.builder()
            .model("gpt-4o-mini")
            .messages(List.of(
                new ChatMessage("system", "You are a helpful assistant that summarizes documents."),
                new ChatMessage("user", prompt)
            ))
            .maxTokens(maxTokens)
            .temperature(0.3)
            .build();
        
        ChatCompletionResult result = openAiService.createChatCompletion(request);
        return result.getChoices().get(0).getMessage().getContent();
    }
    
    public String translateText(String text, String targetLang) {
        if (translate == null) {
            return "[MOCK TRANSLATION to " + targetLang + "]\n\n" + text;
        }

        Translation translation = translate.translate(
            text,
            Translate.TranslateOption.targetLanguage(targetLang)
        );
        return translation.getTranslatedText();
    }
}
