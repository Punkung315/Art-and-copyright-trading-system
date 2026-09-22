package com.maejo.artmarket.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** เปิดใช้ @Scheduled — ตอนนี้มีงานเดียวคือ DeliveryAutoConfirmService */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
