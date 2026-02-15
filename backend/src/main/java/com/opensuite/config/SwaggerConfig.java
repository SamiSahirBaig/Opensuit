package com.opensuite.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("OpenSuite API")
                        .description("Open-Access PDF Suite - Professional PDF processing tools API")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("OpenSuite")
                                .url("https://opensuite.io"))
                        .license(new License()
                                .name("MIT")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Development"),
                        new Server().url("https://api.opensuite.io").description("Production")));
    }
}
