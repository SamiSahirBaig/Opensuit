FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src

RUN apk add --no-cache maven && \
    mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Install LibreOffice for high-fidelity Office → PDF conversions
# Install Tesseract OCR for scanned PDF text extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    fonts-liberation \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-spa \
    tesseract-ocr-fra \
    tesseract-ocr-deu \
    tesseract-ocr-ita \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r opensuite && useradd -r -g opensuite opensuite

COPY --from=build /app/target/*.jar app.jar

RUN mkdir -p /app/temp-files && chown -R opensuite:opensuite /app

USER opensuite

EXPOSE 8080

ENV JAVA_OPTS="-Xms256m -Xmx512m"
ENV SPRING_PROFILES_ACTIVE=prod

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
