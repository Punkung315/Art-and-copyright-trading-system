package com.maejo.artmarket.enums;

/**
 * บทบาทผู้ใช้ — ADMIN รวมอยู่ในนี้แล้ว
 *
 * เดิมผู้ดูแลระบบอยู่คนละตาราง (admin) ที่มี username/password ของตัวเอง
 * ซ้ำกับ users ทั้งชุด ทำให้ต้องมีระบบ login สองทาง ค้นสองตาราง
 * และ enum นี้ไม่มีค่า ADMIN จน AuthResponse ต้องส่ง role = null
 * แล้วแปะ roleName เป็น String มาแทน
 */
public enum Role { BUYER, SELLER, ADMIN }
