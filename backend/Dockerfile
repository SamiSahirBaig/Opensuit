FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src

RUN apk add --no-cache maven && \
    mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S opensuite && adduser -S opensuite -G opensuite

COPY --from=build /app/target/*.jar app.jar

RUN mkdir -p /app/temp-files && chown -R opensuite:opensuite /app

USER opensuite

EXPOSE 8080

ENV JAVA_OPTS="-Xms256m -Xmx512m"
ENV SPRING_PROFILES_ACTIVE=prod

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
