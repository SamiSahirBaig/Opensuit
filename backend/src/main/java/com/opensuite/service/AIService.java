package com.opensuite.service;

import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import com.theokanning.openai.service.OpenAiService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.time.Duration;

@Service
public class AIService {

    private final OpenAiService openAiService;

    public AIService(@Value("${openai.api.key:dummy_key_for_tests}") String apiKey) {
        // Use a reasonable timeout for potentially long translation/summary operations
        this.openAiService = new OpenAiService(apiKey, Duration.ofSeconds(60));
    }

    public enum SummaryLength {
        SHORT(100, 200),
        MEDIUM(300, 500),
        LONG(500, 800);

        private final int wordCount;
        private final int maxTokens;

        SummaryLength(int wordCount, int maxTokens) {
            this.wordCount = wordCount;
            this.maxTokens = maxTokens;
        }

        public int getWordCount() {
            return wordCount;
        }

        public int getMaxTokens() {
            return maxTokens;
        }
    }

    public String summarizePDF(String pdfText, SummaryLength length, boolean bulletPoints) {
        String formatInstruction = bulletPoints ? 
            "Format the summary as a concise list of bullet points highlighting key extracts." : 
            "Format the summary as well-structured paragraphs.";

        String prompt = String.format(
            "Summarize the following document in approximately %d words. %s\n\nDocument Context:\n%s",
            length.getWordCount(),
            formatInstruction,
            pdfText
        );

        ChatCompletionRequest request = ChatCompletionRequest.builder()
            .model("gpt-4o-mini") // Cost-effective model
            .messages(List.of(
                new ChatMessage(ChatMessageRole.SYSTEM.value(), "You are a professional reading assistant skilled at summarizing dense documents without losing core contextual data."),
                new ChatMessage(ChatMessageRole.USER.value(), prompt)
            ))
            .maxTokens(length.getMaxTokens())
            .temperature(0.3)
            .build();

        return openAiService.createChatCompletion(request).getChoices().get(0).getMessage().getContent();
    }

    public String translateText(String text, String targetLanguage, boolean preserveFormatting) {
        String formattingInstruction = preserveFormatting ? 
            "It is critically important that you preserve the exact formatting structure, line breaks, and stylistic layout of the source text." :
            "You may adapt formatting if native sentence structure requires it.";

        String prompt = String.format(
            "Translate the following text to %s. %s\n\nText to translate:\n%s",
            targetLanguage,
            formattingInstruction,
            text
        );

        ChatCompletionRequest request = ChatCompletionRequest.builder()
            .model("gpt-4o-mini")
            .messages(List.of(
                new ChatMessage(ChatMessageRole.SYSTEM.value(), "You are a professional polyglot translator API."),
                new ChatMessage(ChatMessageRole.USER.value(), prompt)
            ))
            // Translations can be large, allow extensive tokens
            .maxTokens(4000)
            .temperature(0.1) // Low temperature for higher accuracy in translation
            .build();

        return openAiService.createChatCompletion(request).getChoices().get(0).getMessage().getContent();
    }
}
