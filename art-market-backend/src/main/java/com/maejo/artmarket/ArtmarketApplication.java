package com.maejo.artmarket;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;

@SpringBootApplication
public class ArtmarketApplication {

    public static void main(String[] args) {
        SpringApplication.run(ArtmarketApplication.class, args);
    }

}
