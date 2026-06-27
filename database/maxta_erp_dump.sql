-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: maxta_erp
-- ------------------------------------------------------
-- Server version	8.0.46-0ubuntu0.22.04.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accounting_periods`
--

DROP TABLE IF EXISTS `accounting_periods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounting_periods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `period_number` int NOT NULL,
  `period_year` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('open','closed') DEFAULT 'open',
  `closed_by` int DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `period_number` (`period_number`,`period_year`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounting_periods`
--

LOCK TABLES `accounting_periods` WRITE;
/*!40000 ALTER TABLE `accounting_periods` DISABLE KEYS */;
INSERT INTO `accounting_periods` VALUES (1,1,2026,'2026-01-01','2026-01-31','closed',NULL,NULL),(2,2,2026,'2026-02-01','2026-02-28','closed',NULL,NULL),(3,3,2026,'2026-03-01','2026-03-31','closed',NULL,NULL),(4,4,2026,'2026-04-01','2026-04-30','closed',NULL,NULL),(5,5,2026,'2026-05-01','2026-05-31','closed',NULL,NULL),(6,6,2026,'2026-06-01','2026-06-30','closed',NULL,NULL),(7,7,2026,'2026-07-01','2026-07-31','closed',NULL,NULL),(8,8,2026,'2026-08-01','2026-08-31','closed',NULL,NULL),(9,9,2026,'2026-09-01','2026-09-30','open',NULL,NULL),(10,10,2026,'2026-10-01','2026-10-31','open',NULL,NULL),(11,11,2026,'2026-11-01','2026-11-30','open',NULL,NULL),(12,12,2026,'2026-12-01','2026-12-31','open',NULL,NULL);
/*!40000 ALTER TABLE `accounting_periods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `adjustment_codes`
--

DROP TABLE IF EXISTS `adjustment_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adjustment_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(50) NOT NULL,
  `type` enum('increase','decrease','both') DEFAULT 'both',
  `gl_account_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adjustment_codes`
--

LOCK TABLES `adjustment_codes` WRITE;
/*!40000 ALTER TABLE `adjustment_codes` DISABLE KEYS */;
INSERT INTO `adjustment_codes` VALUES (1,'DMGD','Damaged/Broken','decrease',NULL,1,'2026-06-26 03:52:53'),(2,'CYCL','Cycle Count Adjustment','both',NULL,1,'2026-06-26 03:52:53'),(3,'PHYS','Physical Count Adjustment','both',NULL,1,'2026-06-26 03:52:53'),(4,'SCRAP','Scrap/Waste','decrease',NULL,1,'2026-06-26 03:52:53'),(5,'FOUND','Found Stock','increase',NULL,1,'2026-06-26 03:52:53'),(6,'REWORK','Rework Return','increase',NULL,1,'2026-06-26 03:52:53'),(7,'SAMPLE','Sample/Display','decrease',NULL,1,'2026-06-26 03:52:53'),(8,'DMGD','Damaged/Broken','decrease',NULL,1,'2026-06-26 03:53:22'),(9,'CYCL','Cycle Count Adjustment','both',NULL,1,'2026-06-26 03:53:22'),(10,'PHYS','Physical Count Adjustment','both',NULL,1,'2026-06-26 03:53:22'),(11,'SCRAP','Scrap/Waste','decrease',NULL,1,'2026-06-26 03:53:22'),(12,'FOUND','Found Stock','increase',NULL,1,'2026-06-26 03:53:22'),(13,'REWORK','Rework Return','increase',NULL,1,'2026-06-26 03:53:22'),(14,'SAMPLE','Sample/Display','decrease',NULL,1,'2026-06-26 03:53:22');
/*!40000 ALTER TABLE `adjustment_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ap_invoices`
--

DROP TABLE IF EXISTS `ap_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) NOT NULL,
  `vendor_id` int NOT NULL,
  `purchase_order_id` int DEFAULT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date NOT NULL,
  `subtotal` decimal(12,2) DEFAULT '0.00',
  `amount` decimal(12,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) DEFAULT '0.00',
  `freight_amount` decimal(12,2) DEFAULT '0.00',
  `freight` decimal(12,2) DEFAULT '0.00',
  `total` decimal(12,2) DEFAULT '0.00',
  `balance` decimal(12,2) DEFAULT '0.00',
  `amount_paid` decimal(12,2) DEFAULT '0.00',
  `status` enum('draft','open','posted','partial','paid','void') DEFAULT 'draft',
  `terms` varchar(50) DEFAULT NULL,
  `posted` tinyint(1) DEFAULT '0',
  `posted_date` datetime DEFAULT NULL,
  `gl_voucher_id` int DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vendor_id` (`vendor_id`),
  KEY `purchase_order_id` (`purchase_order_id`),
  CONSTRAINT `ap_invoices_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`),
  CONSTRAINT `ap_invoices_ibfk_2` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ap_invoices`
--

LOCK TABLES `ap_invoices` WRITE;
/*!40000 ALTER TABLE `ap_invoices` DISABLE KEYS */;
INSERT INTO `ap_invoices` VALUES (1,'INV-V001',1,1,'2026-06-25','2026-07-25',0.00,500.00,0.00,0.00,0.00,500.00,500.00,0.00,'open',NULL,0,NULL,NULL,NULL,1,'2026-06-25 23:43:48'),(2,'VEND-INV-001',1,NULL,'2026-06-26','2026-07-26',0.00,NULL,0.00,0.00,0.00,0.00,0.00,0.00,'open',NULL,0,NULL,NULL,NULL,1,'2026-06-26 00:13:24'),(3,'AP-01001',1,1,'2026-06-26','2026-07-26',0.00,625.00,0.00,0.00,0.00,625.00,0.00,625.00,'paid','Net 30',1,'2026-06-26 02:57:42',NULL,'Auto-created from Receipt POR-01008',1,'2026-06-26 02:57:32'),(4,'AP-01002',1,3,'2026-06-26','2026-07-26',0.00,550.00,0.00,0.00,0.00,550.00,550.00,0.00,'open','Net 30',0,NULL,NULL,'Auto-created from Receipt POR-01009',1,'2026-06-26 03:30:31');
/*!40000 ALTER TABLE `ap_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_queue`
--

DROP TABLE IF EXISTS `approval_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_queue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workflow_id` int NOT NULL,
  `document_type` varchar(50) NOT NULL,
  `document_id` int NOT NULL,
  `document_number` varchar(50) DEFAULT NULL,
  `requested_by` int NOT NULL,
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `approver_id` int DEFAULT NULL,
  `status` enum('pending','approved','rejected','escalated') DEFAULT 'pending',
  `decision_at` timestamp NULL DEFAULT NULL,
  `comments` text,
  `trigger_reason` varchar(255) DEFAULT NULL,
  `trigger_value` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `workflow_id` (`workflow_id`),
  KEY `idx_status` (`status`),
  KEY `idx_document` (`document_type`,`document_id`),
  CONSTRAINT `approval_queue_ibfk_1` FOREIGN KEY (`workflow_id`) REFERENCES `approval_workflows` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_queue`
--

LOCK TABLES `approval_queue` WRITE;
/*!40000 ALTER TABLE `approval_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `approval_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_workflows`
--

DROP TABLE IF EXISTS `approval_workflows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_workflows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `document_type` enum('quote','sales_order','purchase_order','credit_memo') NOT NULL,
  `condition_field` varchar(50) NOT NULL,
  `condition_operator` enum('gt','lt','gte','lte','eq','between') NOT NULL,
  `condition_value` decimal(12,2) NOT NULL,
  `condition_value2` decimal(12,2) DEFAULT NULL,
  `approver_role` varchar(50) DEFAULT 'manager',
  `approver_user_id` int DEFAULT NULL,
  `priority` int DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_workflows`
--

LOCK TABLES `approval_workflows` WRITE;
/*!40000 ALTER TABLE `approval_workflows` DISABLE KEYS */;
INSERT INTO `approval_workflows` VALUES (1,'High Discount Quote','quote','max_discount_percent','gt',15.00,NULL,'manager',NULL,1,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(2,'Low Margin Quote','quote','min_margin_percent','lt',20.00,NULL,'manager',NULL,1,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(3,'Large Quote (>$50K)','quote','total','gt',50000.00,NULL,'owner',NULL,1,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(4,'Large Order (>$50K)','sales_order','total','gt',50000.00,NULL,'owner',NULL,1,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(5,'Large PO (>$25K)','purchase_order','total','gt',25000.00,NULL,'manager',NULL,1,1,'2026-06-27 17:55:40','2026-06-27 17:55:40');
/*!40000 ALTER TABLE `approval_workflows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ar_invoice_lines`
--

DROP TABLE IF EXISTS `ar_invoice_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ar_invoice_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `line_number` int NOT NULL,
  `item_id` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity` decimal(12,4) DEFAULT NULL,
  `unit_price` decimal(12,4) DEFAULT NULL,
  `line_total` decimal(12,2) DEFAULT NULL,
  `gl_account_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_id` (`invoice_id`),
  KEY `item_id` (`item_id`),
  KEY `gl_account_id` (`gl_account_id`),
  CONSTRAINT `ar_invoice_lines_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `ar_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ar_invoice_lines_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `ar_invoice_lines_ibfk_3` FOREIGN KEY (`gl_account_id`) REFERENCES `gl_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ar_invoice_lines`
--

LOCK TABLES `ar_invoice_lines` WRITE;
/*!40000 ALTER TABLE `ar_invoice_lines` DISABLE KEYS */;
INSERT INTO `ar_invoice_lines` VALUES (1,3,1,2,'Tempered Glass Panel 24x36',10.0000,125.0000,1250.00,NULL),(2,4,1,NULL,'Tempered Glass Storefront Panel 48x72',8.0000,185.0000,1480.00,NULL),(3,4,2,NULL,'Tempered Glass Door Lite 24x60',4.0000,145.0000,580.00,NULL),(4,4,3,NULL,'Spandrel Glass Panel 48x48 (Black)',6.0000,210.0000,1260.00,NULL),(5,5,1,NULL,'Tempered Glass Storefront Panel 48x96',5.0000,185.0000,925.00,NULL),(6,7,1,2,'Tempered Glass 24x36',5.0000,95.0000,475.00,NULL),(7,8,1,2,'Test void',1.0000,100.0000,100.00,NULL);
/*!40000 ALTER TABLE `ar_invoice_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ar_invoices`
--

DROP TABLE IF EXISTS `ar_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ar_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(20) NOT NULL,
  `customer_id` int NOT NULL,
  `sales_order_id` int DEFAULT NULL,
  `shipment_id` int DEFAULT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date NOT NULL,
  `subtotal` decimal(12,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) DEFAULT '0.00',
  `freight_amount` decimal(12,2) DEFAULT '0.00',
  `freight` decimal(12,2) DEFAULT '0.00',
  `total` decimal(12,2) DEFAULT '0.00',
  `balance` decimal(12,2) DEFAULT '0.00',
  `amount_paid` decimal(12,2) DEFAULT '0.00',
  `status` enum('draft','open','posted','partial','paid','void') DEFAULT 'draft',
  `terms` varchar(50) DEFAULT NULL,
  `salesperson_id` int DEFAULT NULL,
  `posted` tinyint(1) DEFAULT '0',
  `posted_date` datetime DEFAULT NULL,
  `gl_voucher_id` int DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `void_reason` text,
  `voided_by` int DEFAULT NULL,
  `voided_at` datetime DEFAULT NULL,
  `posted_by` int DEFAULT NULL,
  `posted_at` datetime DEFAULT NULL,
  `payment_terms` varchar(50) DEFAULT 'Net 30',
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `customer_id` (`customer_id`),
  KEY `sales_order_id` (`sales_order_id`),
  KEY `shipment_id` (`shipment_id`),
  KEY `salesperson_id` (`salesperson_id`),
  KEY `idx_ari_status` (`status`),
  CONSTRAINT `ar_invoices_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `ar_invoices_ibfk_2` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `ar_invoices_ibfk_3` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`),
  CONSTRAINT `ar_invoices_ibfk_4` FOREIGN KEY (`salesperson_id`) REFERENCES `salespeople` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ar_invoices`
--

LOCK TABLES `ar_invoices` WRITE;
/*!40000 ALTER TABLE `ar_invoices` DISABLE KEYS */;
INSERT INTO `ar_invoices` VALUES (1,'INV-10002',1,1,NULL,'2026-06-25','2026-07-25',449.95,0.00,0.00,0.00,449.95,0.00,449.95,'paid',NULL,NULL,0,NULL,NULL,NULL,1,'2026-06-25 23:43:24',NULL,NULL,NULL,NULL,NULL,'Net 30'),(2,'INV-10004',2,3,NULL,'2026-06-26','2026-07-26',1250.00,0.00,0.00,0.00,1250.00,0.00,0.00,'posted',NULL,NULL,0,NULL,NULL,NULL,1,'2026-06-26 00:11:48',NULL,NULL,NULL,1,'2026-06-26 00:11:48','Net 30'),(3,'INV-10005',2,3,NULL,'2026-06-26','2026-07-26',1250.00,0.00,0.00,0.00,1250.00,0.00,2500.00,'paid',NULL,NULL,0,NULL,NULL,NULL,1,'2026-06-26 00:12:37',NULL,NULL,NULL,1,'2026-06-26 00:12:38','Net 30'),(4,'INV-10006',2,6,5,'2026-06-26','2026-07-26',3320.00,0.00,0.00,0.00,3320.00,0.00,3320.00,'paid',NULL,NULL,1,NULL,NULL,NULL,1,'2026-06-26 02:34:37',NULL,NULL,NULL,1,'2026-06-26 02:35:06','Net 30'),(5,'INV-10009',2,8,NULL,'2026-06-26','2026-07-26',925.00,0.00,0.00,0.00,925.00,0.00,925.00,'paid',NULL,NULL,1,NULL,NULL,NULL,1,'2026-06-26 23:53:31',NULL,NULL,NULL,1,'2026-06-26 23:53:40','Net 30'),(6,'INV-10010',2,6,4,'2026-06-27','2026-07-27',0.00,0.00,0.00,0.00,0.00,0.00,0.00,'draft',NULL,NULL,0,NULL,NULL,NULL,1,'2026-06-27 00:00:58',NULL,NULL,NULL,NULL,NULL,'Net 30'),(7,'INV-10011',1,14,NULL,'2026-06-27','2026-07-27',475.00,0.00,0.00,0.00,475.00,0.00,475.00,'paid',NULL,NULL,1,NULL,NULL,NULL,1,'2026-06-27 13:14:40',NULL,NULL,NULL,1,'2026-06-27 13:14:41','Net 30'),(8,'INV-10012',1,NULL,NULL,'2026-06-27','2026-07-27',100.00,0.00,0.00,0.00,100.00,100.00,0.00,'void',NULL,NULL,1,NULL,NULL,NULL,1,'2026-06-27 13:14:41','Test void',1,'2026-06-27 13:14:41',1,'2026-06-27 13:14:41','Net 30');
/*!40000 ALTER TABLE `ar_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `table_name` varchar(64) NOT NULL,
  `record_id` bigint unsigned NOT NULL,
  `operation` varchar(20) NOT NULL,
  `changed_by` int unsigned DEFAULT NULL,
  `changed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `old_data` json DEFAULT NULL,
  `new_data` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_table_record` (`table_name`,`record_id`),
  KEY `idx_changed_by` (`changed_by`),
  KEY `idx_changed_at` (`changed_at`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
INSERT INTO `audit_log` VALUES (1,'customers',2,'INSERT',1,'2026-06-26 00:10:43.439',NULL,'{\"company_name\": \"ABC Glass Corp\", \"customer_number\": \"C-10002\"}','127.0.0.1',NULL),(2,'quotes',3,'INSERT',1,'2026-06-26 00:11:12.057',NULL,'{\"total\": 1250, \"customer_id\": 2, \"quote_number\": \"QT-01003\"}','127.0.0.1',NULL),(3,'quotes',1,'CONVERT',1,'2026-06-26 00:11:12.125','{\"status\": \"draft\"}','{\"status\": \"converted\", \"order_id\": 3}','127.0.0.1',NULL),(4,'sales_orders',3,'INSERT',1,'2026-06-26 00:11:12.133',NULL,'{\"from_quote\": \"QT-01001\", \"order_number\": \"SO-10003\"}','127.0.0.1',NULL),(5,'shipments',3,'INSERT',1,'2026-06-26 00:11:12.265',NULL,'{\"sales_order_id\": 1, \"shipment_number\": \"SH-01003\"}','127.0.0.1',NULL),(6,'customer_deposits',1,'INSERT',1,'2026-06-26 00:11:48.075',NULL,'{\"amount\": 500, \"order_id\": \"3\", \"payment_method\": \"check\"}','127.0.0.1',NULL),(7,'credit_memos',1,'INSERT',1,'2026-06-26 00:11:48.283',NULL,'{\"amount\": 125, \"reason\": \"damaged\", \"customer_id\": 2, \"memo_number\": \"CM-1001\"}','127.0.0.1',NULL),(8,'ar_invoices',3,'INSERT',1,'2026-06-26 00:12:37.981',NULL,'{\"total\": 1250, \"customer_id\": 2, \"invoice_number\": \"INV-10005\"}','127.0.0.1',NULL),(9,'ar_invoices',3,'POST',1,'2026-06-26 00:12:38.056','{\"status\": \"draft\"}','{\"status\": \"posted\"}','127.0.0.1',NULL),(10,'purchase_orders',2,'INSERT',1,'2026-06-26 00:13:07.971',NULL,'{\"total\": 2250, \"po_number\": \"PO-05003\", \"vendor_id\": 1}','127.0.0.1',NULL),(11,'ap_invoices',2,'INSERT',1,'2026-06-26 00:13:24.306',NULL,'{\"total\": 0, \"vendor_id\": 1, \"invoice_number\": \"VEND-INV-001\"}','127.0.0.1',NULL),(12,'purchase_orders',2,'APPROVE',1,'2026-06-26 00:14:00.559','{\"status\": \"draft\"}','{\"status\": \"open\"}','127.0.0.1',NULL),(13,'customer_payments',4,'INSERT',1,'2026-06-26 00:14:00.654',NULL,'{\"amount\": 1250, \"applied\": 1250, \"customer_id\": 2, \"payment_method\": \"check\", \"payment_number\": \"PMT-01008\"}','127.0.0.1',NULL),(14,'po_receipts',4,'INSERT',1,'2026-06-26 00:14:30.070',NULL,'{\"receipt_number\": \"POR-01006\", \"purchase_order_id\": 2}','127.0.0.1',NULL),(15,'journal_vouchers',3,'INSERT',1,'2026-06-26 00:18:59.551',NULL,'{\"total_debit\": 500, \"voucher_number\": \"JV-01003\"}','127.0.0.1',NULL),(16,'vendor_payments',3,'INSERT',1,'2026-06-26 00:20:04.324',NULL,'{\"amount\": 2250, \"vendor_id\": 1, \"payment_method\": \"check\", \"payment_number\": \"VP-1003\"}','127.0.0.1',NULL),(17,'credit_memos',2,'INSERT',1,'2026-06-26 00:20:04.391',NULL,'{\"amount\": 50, \"reason\": \"damaged\", \"customer_id\": 2, \"memo_number\": \"CM-1003\"}','127.0.0.1',NULL),(18,'customer_deposits',2,'INSERT',1,'2026-06-26 00:20:04.456',NULL,'{\"amount\": 500, \"order_id\": \"3\", \"payment_method\": \"credit_card\"}','127.0.0.1',NULL),(19,'quotes',4,'CONVERT',1,'2026-06-26 02:14:01.359','{\"status\": \"sent\"}','{\"status\": \"converted\", \"order_id\": 5}','127.0.0.1',NULL),(20,'sales_orders',5,'INSERT',1,'2026-06-26 02:14:01.367',NULL,'{\"from_quote\": \"QT-01004\", \"order_number\": \"SO-10005\"}','127.0.0.1',NULL),(21,'quotes',2,'ACCEPT',1,'2026-06-26 02:30:55.119','{\"status\": \"draft\"}','{\"status\": \"accepted\"}','127.0.0.1',NULL),(22,'quotes',2,'CONVERT',1,'2026-06-26 02:31:11.973','{\"status\": \"accepted\"}','{\"status\": \"converted\", \"order_id\": 6}','127.0.0.1',NULL),(23,'sales_orders',6,'INSERT',1,'2026-06-26 02:31:11.983',NULL,'{\"from_quote\": \"QT-01002\", \"order_number\": \"SO-10006\"}','127.0.0.1',NULL),(24,'shipments',5,'INSERT',1,'2026-06-26 02:33:27.109',NULL,'{\"total_panels\": 18, \"sales_order_id\": 6, \"shipment_number\": \"SH-01005\"}','127.0.0.1',NULL),(25,'ar_invoices',4,'INSERT',1,'2026-06-26 02:34:37.601',NULL,'{\"from_shipment\": \"SH-01005\", \"invoice_number\": \"INV-10006\"}','127.0.0.1',NULL),(26,'ar_invoices',4,'POST',1,'2026-06-26 02:35:06.568','{\"status\": \"draft\"}','{\"status\": \"posted\"}','127.0.0.1',NULL),(27,'ar_invoices',4,'PAYMENT',1,'2026-06-26 02:38:32.432',NULL,'{\"amount\": 3320, \"payment_number\": \"PMT-01009\"}','127.0.0.1',NULL),(28,'ar_invoices',4,'PAYMENT',1,'2026-06-26 02:42:22.904',NULL,'{\"amount\": 3320, \"payment_number\": \"PMT-01010\"}','127.0.0.1',NULL),(29,'po_receipts',6,'INSERT',1,'2026-06-26 02:57:15.795',NULL,'{\"po_number\": \"PO-05002\", \"receipt_number\": \"POR-01008\", \"total_received\": 5}','127.0.0.1',NULL),(30,'ap_invoices',3,'INSERT',1,'2026-06-26 02:57:32.671',NULL,'{\"total\": 625, \"receipt_id\": \"6\", \"invoice_number\": \"AP-01001\"}','127.0.0.1',NULL),(31,'ap_invoices',3,'POST',1,'2026-06-26 02:57:42.568','{\"status\": \"open\"}','{\"status\": \"posted\"}','127.0.0.1',NULL),(32,'ap_invoices',3,'PAY',1,'2026-06-26 02:58:44.529','{\"balance\": \"625.00\"}','{\"balance\": 624.99375, \"payment\": 625}','127.0.0.1',NULL),(33,'ap_invoices',3,'PAY',1,'2026-06-26 02:59:14.662','{\"balance\": \"625.00\"}','{\"balance\": 0, \"payment\": 625}','127.0.0.1',NULL),(34,'purchase_orders',1,'CLOSE',1,'2026-06-26 02:59:22.752','{\"status\": \"partial\"}','{\"status\": \"closed\"}','127.0.0.1',NULL),(35,'purchase_orders',2,'CLOSE',1,'2026-06-26 03:10:11.479','{\"status\": \"partial\"}','{\"status\": \"closed\"}','127.0.0.1',NULL),(36,'purchase_orders',3,'APPROVE',1,'2026-06-26 03:11:25.467','{\"status\": \"draft\"}','{\"status\": \"open\"}','127.0.0.1',NULL),(37,'purchase_orders',3,'SEND',1,'2026-06-26 03:11:25.582','{\"status\": \"open\"}','{\"status\": \"sent\"}','127.0.0.1',NULL),(38,'po_receipts',7,'INSERT',1,'2026-06-26 03:11:25.764',NULL,'{\"po_number\": \"PO-05004\", \"receipt_number\": \"POR-01009\", \"total_received\": 10}','127.0.0.1',NULL),(39,'ap_invoices',4,'INSERT',1,'2026-06-26 03:30:32.022',NULL,'{\"total\": 0, \"receipt_id\": \"7\", \"invoice_number\": \"AP-01002\"}','127.0.0.1',NULL),(40,'purchase_orders',1,'PRINT',1,'2026-06-26 17:19:41.188',NULL,'{\"action\": \"pdf_generated\"}','127.0.0.1',NULL),(41,'purchase_orders',1,'PRINT',1,'2026-06-26 17:20:44.832',NULL,'{\"action\": \"pdf_generated\"}','127.0.0.1',NULL),(42,'purchase_orders',3,'PRINT',1,'2026-06-26 17:22:32.268',NULL,'{\"action\": \"pdf_generated\"}','127.0.0.1',NULL),(43,'purchase_orders',3,'PRINT',1,'2026-06-26 17:23:58.587',NULL,'{\"action\": \"pdf_generated\"}','127.0.0.1',NULL),(44,'purchase_orders',2,'CLOSE',1,'2026-06-26 19:17:05.588','{\"status\": \"partial\"}','{\"status\": \"closed\"}','127.0.0.1',NULL),(45,'quotes',3,'PRINT',1,'2026-06-26 19:17:34.080',NULL,'{\"action\": \"pdf_generated\"}','127.0.0.1',NULL),(46,'quotes',3,'ACCEPT',1,'2026-06-26 23:05:25.299','{\"status\": \"draft\"}','{\"status\": \"accepted\"}','127.0.0.1',NULL),(47,'quotes',3,'CONVERT',1,'2026-06-26 23:06:02.693','{\"status\": \"accepted\"}','{\"status\": \"converted\", \"order_id\": 7}','127.0.0.1',NULL),(48,'sales_orders',7,'INSERT',1,'2026-06-26 23:06:02.700',NULL,'{\"from_quote\": \"QT-01003\", \"order_number\": \"SO-10007\"}','127.0.0.1',NULL),(49,'shipments',7,'INSERT',1,'2026-06-26 23:10:47.621',NULL,'{\"total_panels\": 23, \"sales_order_id\": 5, \"shipment_number\": \"SH-01007\"}','127.0.0.1',NULL),(50,'shipments',8,'INSERT',1,'2026-06-26 23:13:02.444',NULL,'{\"total_panels\": 23, \"sales_order_id\": 5, \"shipment_number\": \"SH-01008\"}','127.0.0.1',NULL),(51,'shipments',9,'INSERT',1,'2026-06-26 23:14:12.097',NULL,'{\"total_panels\": 23, \"sales_order_id\": 5, \"shipment_number\": \"SH-01009\"}','127.0.0.1',NULL),(52,'ar_invoices',1,'PAYMENT',1,'2026-06-26 23:15:01.057',NULL,'{\"amount\": 449.95, \"payment_number\": \"PMT-01011\"}','127.0.0.1',NULL),(53,'quotes',6,'INSERT',1,'2026-06-26 23:33:47.919',NULL,'{\"customer_id\": 2, \"project_name\": \"Test Storefront Project\", \"quote_number\": \"QT-01005\"}','127.0.0.1',NULL),(54,'quotes',6,'ACCEPT',1,'2026-06-26 23:36:23.456','{\"status\": \"draft\"}','{\"status\": \"accepted\"}','127.0.0.1',NULL),(55,'quotes',6,'CONVERT',1,'2026-06-26 23:36:56.847','{\"status\": \"accepted\"}','{\"status\": \"converted\", \"order_id\": 8}','127.0.0.1',NULL),(56,'sales_orders',8,'INSERT',1,'2026-06-26 23:36:56.854',NULL,'{\"from_quote\": \"QT-01005\", \"order_number\": \"SO-10008\"}','127.0.0.1',NULL),(57,'sales_orders',8,'PRINT',1,'2026-06-26 23:41:59.791',NULL,'{\"action\": \"pdf_generated\"}','127.0.0.1',NULL),(58,'quotes',6,'PRINT',1,'2026-06-26 23:42:09.820',NULL,'{\"action\": \"pdf_generated\"}','127.0.0.1',NULL),(59,'ar_invoices',2,'PRINT',1,'2026-06-26 23:42:12.211',NULL,'{\"action\": \"pdf_generated\"}','127.0.0.1',NULL),(60,'sales_orders',8,'PRINT',1,'2026-06-26 23:42:46.502',NULL,'{\"action\": \"pdf_generated\"}','127.0.0.1',NULL),(61,'sales_orders',8,'PRINT',1,'2026-06-26 23:45:11.685',NULL,'{\"action\": \"pdf_generated\"}','127.0.0.1',NULL),(62,'sales_orders',8,'DEPOSIT',1,'2026-06-26 23:50:09.215',NULL,'{\"amount\": 500, \"payment_method\": \"wire\", \"reference_number\": \"WIRE-2026-001\"}','127.0.0.1',NULL),(63,'ar_invoices',5,'INSERT',1,'2026-06-26 23:53:31.308',NULL,'{\"total\": 925, \"invoice_number\": \"INV-10009\"}','127.0.0.1',NULL),(64,'ar_invoices',5,'POST',1,'2026-06-26 23:53:40.388','{\"status\": \"draft\"}','{\"status\": \"posted\"}','127.0.0.1',NULL),(65,'ar_invoices',5,'PAYMENT',1,'2026-06-26 23:53:40.556',NULL,'{\"amount\": 925, \"payment_number\": \"PMT-01012\"}','127.0.0.1',NULL),(66,'ar_invoices',6,'INSERT',1,'2026-06-27 00:00:58.738',NULL,'{\"from_shipment\": \"SH-01004\", \"invoice_number\": \"INV-10010\"}','127.0.0.1',NULL),(67,'sales_orders',11,'INSERT',1,'2026-06-27 12:31:07.905',NULL,'{\"customer_id\": 1, \"order_number\": \"SO-10011\"}','127.0.0.1',NULL),(68,'sales_orders',12,'INSERT',1,'2026-06-27 12:46:21.029',NULL,'{\"customer_id\": 1, \"order_number\": \"SO-10012\"}','127.0.0.1',NULL),(69,'sales_orders',13,'INSERT',1,'2026-06-27 12:47:08.761',NULL,'{\"customer_id\": 1, \"order_number\": \"SO-10013\"}','127.0.0.1',NULL),(70,'sales_orders',14,'INSERT',1,'2026-06-27 13:14:40.332',NULL,'{\"customer_id\": 1, \"order_number\": \"SO-10014\"}','127.0.0.1',NULL),(71,'ar_invoices',7,'INSERT',1,'2026-06-27 13:14:40.933',NULL,'{\"total\": 475, \"customer_id\": 1, \"invoice_number\": \"INV-10011\"}','127.0.0.1',NULL),(72,'ar_invoices',7,'POST',1,'2026-06-27 13:14:41.137','{\"status\": \"draft\"}','{\"status\": \"posted\"}','127.0.0.1',NULL),(73,'ar_invoices',7,'PAYMENT',1,'2026-06-27 13:14:41.382',NULL,'{\"amount\": 475, \"payment_number\": \"PMT-01013\"}','127.0.0.1',NULL),(74,'ar_invoices',8,'INSERT',1,'2026-06-27 13:14:41.557',NULL,'{\"total\": 100, \"customer_id\": 1, \"invoice_number\": \"INV-10012\"}','127.0.0.1',NULL),(75,'ar_invoices',8,'POST',1,'2026-06-27 13:14:41.729','{\"status\": \"draft\"}','{\"status\": \"posted\"}','127.0.0.1',NULL),(76,'ar_invoices',8,'VOID',1,'2026-06-27 13:14:41.820','{\"status\": \"posted\"}','{\"reason\": \"Test void\", \"status\": \"void\"}','127.0.0.1',NULL),(77,'po_receipts',8,'INSERT',1,'2026-06-27 13:25:55.464',NULL,'{\"po_number\": \"PO-05004\", \"receipt_number\": \"POR-01010\", \"total_received\": 5}','127.0.0.1',NULL),(78,'shipments',10,'INSERT',1,'2026-06-27 13:26:06.368',NULL,'{\"total_panels\": 2, \"sales_order_id\": 1, \"shipment_number\": \"SH-01010\"}','127.0.0.1',NULL),(79,'shipments',11,'INSERT',1,'2026-06-27 13:26:51.587',NULL,'{\"total_panels\": 1, \"sales_order_id\": 1, \"shipment_number\": \"SH-01011\"}','127.0.0.1',NULL),(80,'sales_orders',15,'INSERT',1,'2026-06-27 13:39:25.971',NULL,'{\"customer_id\": 1, \"order_number\": \"SO-10015\"}','127.0.0.1',NULL),(81,'sales_orders',16,'INSERT',1,'2026-06-27 13:40:17.625',NULL,'{\"customer_id\": 1, \"order_number\": \"SO-10016\"}','127.0.0.1',NULL),(82,'sales_orders',17,'INSERT',1,'2026-06-27 14:02:40.665',NULL,'{\"customer_id\": 1, \"order_number\": \"SO-10017\"}','127.0.0.1',NULL),(83,'sales_orders',18,'INSERT',1,'2026-06-27 14:14:10.913',NULL,'{\"customer_id\": 1, \"order_number\": \"SO-10018\"}','127.0.0.1',NULL),(84,'sales_orders',19,'INSERT',1,'2026-06-27 14:32:06.312',NULL,'{\"customer_id\": 1, \"order_number\": \"SO-10019\"}','127.0.0.1',NULL);
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_accounts`
--

DROP TABLE IF EXISTS `bank_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_name` varchar(100) NOT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `routing_number` varchar(20) DEFAULT NULL,
  `gl_account_id` int DEFAULT NULL,
  `current_balance` decimal(14,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `gl_account_id` (`gl_account_id`),
  CONSTRAINT `bank_accounts_ibfk_1` FOREIGN KEY (`gl_account_id`) REFERENCES `gl_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_accounts`
--

LOCK TABLES `bank_accounts` WRITE;
/*!40000 ALTER TABLE `bank_accounts` DISABLE KEYS */;
INSERT INTO `bank_accounts` VALUES (1,'Operating Account','Chase Bank','****4521','021000021',NULL,25000.00,1),(2,'Payroll Account','Bank of America','****7890','026009593',NULL,15000.00,1);
/*!40000 ALTER TABLE `bank_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_reconciliation`
--

DROP TABLE IF EXISTS `bank_reconciliation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_reconciliation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bank_id` int NOT NULL,
  `statement_date` date NOT NULL,
  `statement_balance` decimal(14,2) NOT NULL,
  `book_balance` decimal(14,2) DEFAULT NULL,
  `adjusted_balance` decimal(14,2) DEFAULT NULL,
  `difference` decimal(14,2) DEFAULT NULL,
  `status` enum('in_progress','reconciled') DEFAULT 'in_progress',
  `reconciled_by` int DEFAULT NULL,
  `reconciled_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bank_id` (`bank_id`),
  CONSTRAINT `bank_reconciliation_ibfk_1` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_reconciliation`
--

LOCK TABLES `bank_reconciliation` WRITE;
/*!40000 ALTER TABLE `bank_reconciliation` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_reconciliation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_reconciliations`
--

DROP TABLE IF EXISTS `bank_reconciliations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_reconciliations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bank_account_id` int NOT NULL,
  `statement_date` date NOT NULL,
  `statement_balance` decimal(14,2) NOT NULL,
  `book_balance` decimal(14,2) DEFAULT NULL,
  `adjusted_balance` decimal(14,2) DEFAULT NULL,
  `difference` decimal(14,2) DEFAULT NULL,
  `status` enum('in_progress','reconciled') DEFAULT 'in_progress',
  `reconciled_by` int DEFAULT NULL,
  `reconciled_date` datetime DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bank_account_id` (`bank_account_id`),
  CONSTRAINT `bank_reconciliations_ibfk_1` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_reconciliations`
--

LOCK TABLES `bank_reconciliations` WRITE;
/*!40000 ALTER TABLE `bank_reconciliations` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_reconciliations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_transactions`
--

DROP TABLE IF EXISTS `bank_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bank_account_id` int NOT NULL,
  `transaction_date` date NOT NULL,
  `type` enum('deposit','withdrawal','check','transfer','fee','interest','adjustment') DEFAULT 'withdrawal',
  `reference` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `amount` decimal(14,2) NOT NULL,
  `cleared` tinyint(1) DEFAULT '0',
  `reconciliation_id` int DEFAULT NULL,
  `gl_transaction_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bank_account_id` (`bank_account_id`),
  CONSTRAINT `bank_transactions_ibfk_1` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_transactions`
--

LOCK TABLES `bank_transactions` WRITE;
/*!40000 ALTER TABLE `bank_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `banks`
--

DROP TABLE IF EXISTS `banks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `banks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bank_name` varchar(100) NOT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `routing_number` varchar(20) DEFAULT NULL,
  `gl_account_id` int DEFAULT NULL,
  `current_balance` decimal(14,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `gl_account_id` (`gl_account_id`),
  CONSTRAINT `banks_ibfk_1` FOREIGN KEY (`gl_account_id`) REFERENCES `gl_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `banks`
--

LOCK TABLES `banks` WRITE;
/*!40000 ALTER TABLE `banks` DISABLE KEYS */;
INSERT INTO `banks` VALUES (1,'Chase Business Checking','****4567','021000021',1,47750.00,1),(2,'Wells Fargo Savings','****8901','121000248',1,25000.00,1);
/*!40000 ALTER TABLE `banks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bom_headers`
--

DROP TABLE IF EXISTS `bom_headers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bom_headers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `revision` varchar(20) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `batch_size` decimal(12,4) DEFAULT '1.0000',
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `bom_headers_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bom_headers`
--

LOCK TABLES `bom_headers` WRITE;
/*!40000 ALTER TABLE `bom_headers` DISABLE KEYS */;
INSERT INTO `bom_headers` VALUES (1,2,'A','TG Panel BOM',NULL,NULL,1.0000,1,NULL,'2026-06-26 10:51:22'),(2,8,'A','Laminated Safety Glass BOM - 2 lites + PVB interlayer',NULL,NULL,1.0000,1,NULL,'2026-06-27 12:34:47');
/*!40000 ALTER TABLE `bom_headers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bom_lines`
--

DROP TABLE IF EXISTS `bom_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bom_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bom_id` int NOT NULL,
  `sequence` int NOT NULL,
  `component_item_id` int NOT NULL,
  `quantity_per` decimal(12,6) NOT NULL,
  `width_mm` decimal(10,2) DEFAULT NULL,
  `height_mm` decimal(10,2) DEFAULT NULL,
  `thickness_mm` decimal(6,2) DEFAULT NULL,
  `waste_percent` decimal(5,2) DEFAULT '0.00',
  `uom` varchar(20) DEFAULT NULL,
  `operation_sequence` int DEFAULT NULL,
  `is_fixed_qty` tinyint(1) DEFAULT '0',
  `reference_designator` varchar(50) DEFAULT NULL,
  `component_type` enum('glass_lite','interlayer','hardware','consumable','other') DEFAULT 'other',
  `consumed_at_operation` int DEFAULT NULL,
  `overhang_mm` decimal(6,2) DEFAULT '0.00',
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `bom_id` (`bom_id`),
  KEY `component_item_id` (`component_item_id`),
  CONSTRAINT `bom_lines_ibfk_1` FOREIGN KEY (`bom_id`) REFERENCES `bom_headers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bom_lines_ibfk_2` FOREIGN KEY (`component_item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bom_lines`
--

LOCK TABLES `bom_lines` WRITE;
/*!40000 ALTER TABLE `bom_lines` DISABLE KEYS */;
INSERT INTO `bom_lines` VALUES (1,1,1,3,1.000000,NULL,NULL,NULL,5.00,'Sheet',1,0,NULL,'other',NULL,0.00,NULL),(2,2,10,3,1.000000,NULL,NULL,NULL,5.00,'Sheet',10,0,NULL,'glass_lite',10,0.00,'Outer glass lite - cut to size'),(3,2,20,3,1.000000,NULL,NULL,NULL,5.00,'Sheet',10,0,NULL,'glass_lite',10,0.00,'Inner glass lite - cut to size'),(4,2,30,9,1.000000,NULL,NULL,NULL,3.00,'SqFt',40,0,NULL,'interlayer',40,0.00,'PVB 0.76mm interlayer - cut in clean room');
/*!40000 ALTER TABLE `bom_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `capacity_overrides`
--

DROP TABLE IF EXISTS `capacity_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `capacity_overrides` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_center_id` int NOT NULL,
  `override_date` date NOT NULL,
  `capacity_hours` decimal(5,2) DEFAULT NULL,
  `is_closed` tinyint(1) DEFAULT '0',
  `reason` varchar(200) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_center_id` (`work_center_id`),
  CONSTRAINT `capacity_overrides_ibfk_1` FOREIGN KEY (`work_center_id`) REFERENCES `work_centers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `capacity_overrides`
--

LOCK TABLES `capacity_overrides` WRITE;
/*!40000 ALTER TABLE `capacity_overrides` DISABLE KEYS */;
/*!40000 ALTER TABLE `capacity_overrides` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carriers`
--

DROP TABLE IF EXISTS `carriers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carriers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carriers`
--

LOCK TABLES `carriers` WRITE;
/*!40000 ALTER TABLE `carriers` DISABLE KEYS */;
/*!40000 ALTER TABLE `carriers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commission_ledger`
--

DROP TABLE IF EXISTS `commission_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `commission_ledger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `salesperson_id` int NOT NULL,
  `invoice_id` int DEFAULT NULL,
  `invoice_number` varchar(50) DEFAULT NULL,
  `invoice_total` decimal(15,2) DEFAULT NULL,
  `commission_rate` decimal(5,2) DEFAULT NULL,
  `commission_amount` decimal(15,2) DEFAULT NULL,
  `status` enum('pending','earned','paid') DEFAULT 'pending',
  `earned_date` date DEFAULT NULL,
  `paid_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commission_ledger`
--

LOCK TABLES `commission_ledger` WRITE;
/*!40000 ALTER TABLE `commission_ledger` DISABLE KEYS */;
/*!40000 ALTER TABLE `commission_ledger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commission_rules`
--

DROP TABLE IF EXISTS `commission_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `commission_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `salesperson_id` int DEFAULT NULL,
  `customer_type` varchar(50) DEFAULT NULL,
  `min_revenue` decimal(12,2) DEFAULT '0.00',
  `max_revenue` decimal(12,2) DEFAULT '999999999.00',
  `commission_rate` decimal(5,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `salesperson_id` (`salesperson_id`),
  CONSTRAINT `commission_rules_ibfk_1` FOREIGN KEY (`salesperson_id`) REFERENCES `salespeople` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commission_rules`
--

LOCK TABLES `commission_rules` WRITE;
/*!40000 ALTER TABLE `commission_rules` DISABLE KEYS */;
INSERT INTO `commission_rules` VALUES (1,'Standard Rate',NULL,NULL,0.00,999999999.00,5.00,1,'2026-06-27 17:55:40'),(2,'New Customer Bonus',NULL,NULL,0.00,999999999.00,8.00,1,'2026-06-27 17:55:40'),(3,'House Account',NULL,NULL,0.00,999999999.00,2.00,1,'2026-06-27 17:55:40');
/*!40000 ALTER TABLE `commission_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commissions`
--

DROP TABLE IF EXISTS `commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `commissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `salesperson_id` int NOT NULL,
  `invoice_id` int NOT NULL,
  `commission_rate` decimal(5,2) NOT NULL,
  `invoice_amount` decimal(12,2) NOT NULL,
  `commission_amount` decimal(12,2) NOT NULL,
  `status` enum('pending','approved','paid') DEFAULT 'pending',
  `paid_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `salesperson_id` (`salesperson_id`),
  KEY `invoice_id` (`invoice_id`),
  CONSTRAINT `commissions_ibfk_1` FOREIGN KEY (`salesperson_id`) REFERENCES `salespeople` (`id`),
  CONSTRAINT `commissions_ibfk_2` FOREIGN KEY (`invoice_id`) REFERENCES `ar_invoices` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commissions`
--

LOCK TABLES `commissions` WRITE;
/*!40000 ALTER TABLE `commissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `commissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_info`
--

DROP TABLE IF EXISTS `company_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_info` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(100) NOT NULL,
  `address_line1` varchar(100) DEFAULT NULL,
  `address_line2` varchar(100) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip` varchar(20) DEFAULT NULL,
  `country` varchar(50) DEFAULT 'USA',
  `phone` varchar(30) DEFAULT NULL,
  `fax` varchar(30) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(100) DEFAULT NULL,
  `tax_id` varchar(50) DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_info`
--

LOCK TABLES `company_info` WRITE;
/*!40000 ALTER TABLE `company_info` DISABLE KEYS */;
INSERT INTO `company_info` VALUES (1,'Max TA Group LLC',NULL,NULL,'New York','NY',NULL,'USA','',NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `company_info` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_settings`
--

DROP TABLE IF EXISTS `company_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_settings` (
  `id` int NOT NULL DEFAULT '1',
  `company_name` varchar(200) DEFAULT 'Max TA Group LLC',
  `address1` varchar(200) DEFAULT '',
  `address2` varchar(200) DEFAULT '',
  `city` varchar(100) DEFAULT '',
  `state` varchar(50) DEFAULT '',
  `zip` varchar(20) DEFAULT '',
  `country` varchar(100) DEFAULT 'USA',
  `phone` varchar(50) DEFAULT '',
  `fax` varchar(50) DEFAULT '',
  `email` varchar(200) DEFAULT '',
  `website` varchar(200) DEFAULT '',
  `tax_id` varchar(50) DEFAULT '',
  `logo_url` varchar(500) DEFAULT '',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_settings`
--

LOCK TABLES `company_settings` WRITE;
/*!40000 ALTER TABLE `company_settings` DISABLE KEYS */;
INSERT INTO `company_settings` VALUES (1,'Max TA Group LLC','','','','','','USA','','','','','','','2026-06-27 00:14:12');
/*!40000 ALTER TABLE `company_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `credit_memo_lines`
--

DROP TABLE IF EXISTS `credit_memo_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `credit_memo_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `credit_memo_id` int NOT NULL,
  `item_id` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity` decimal(12,4) NOT NULL DEFAULT '1.0000',
  `unit_price` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `line_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `credit_memo_id` (`credit_memo_id`),
  CONSTRAINT `credit_memo_lines_ibfk_1` FOREIGN KEY (`credit_memo_id`) REFERENCES `credit_memos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `credit_memo_lines`
--

LOCK TABLES `credit_memo_lines` WRITE;
/*!40000 ALTER TABLE `credit_memo_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `credit_memo_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `credit_memos`
--

DROP TABLE IF EXISTS `credit_memos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `credit_memos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `memo_number` varchar(20) NOT NULL,
  `customer_id` int NOT NULL,
  `invoice_id` int DEFAULT NULL,
  `memo_date` date NOT NULL,
  `reason` enum('return','damaged','pricing_error','discount','other') NOT NULL DEFAULT 'other',
  `reason_notes` text,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount_applied` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('draft','posted','applied','void') NOT NULL DEFAULT 'draft',
  `notes` text,
  `created_by` int NOT NULL,
  `posted_by` int DEFAULT NULL,
  `posted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `memo_number` (`memo_number`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `credit_memos`
--

LOCK TABLES `credit_memos` WRITE;
/*!40000 ALTER TABLE `credit_memos` DISABLE KEYS */;
INSERT INTO `credit_memos` VALUES (1,'CM-1001',2,2,'2026-06-26','damaged',NULL,125.00,0.00,0.00,0.00,0.00,'draft','1 panel arrived cracked',1,NULL,NULL,'2026-06-26 00:11:48','2026-06-26 00:11:48'),(2,'CM-1003',2,3,'2026-06-26','damaged',NULL,50.00,0.00,0.00,0.00,0.00,'draft',NULL,1,NULL,NULL,'2026-06-26 00:20:04','2026-06-26 00:20:04');
/*!40000 ALTER TABLE `credit_memos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crm_activities`
--

DROP TABLE IF EXISTS `crm_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_activities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `activity_type` enum('call','email','meeting','site_visit','quote_sent','follow_up','note','task') NOT NULL,
  `subject` varchar(200) NOT NULL,
  `description` text,
  `customer_id` int DEFAULT NULL,
  `lead_id` int DEFAULT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `status` enum('planned','completed','cancelled','overdue') DEFAULT 'planned',
  `assigned_to` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `lead_id` (`lead_id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `crm_activities_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `crm_activities_ibfk_2` FOREIGN KEY (`lead_id`) REFERENCES `crm_leads` (`id`) ON DELETE SET NULL,
  CONSTRAINT `crm_activities_ibfk_3` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `crm_activities_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crm_activities`
--

LOCK TABLES `crm_activities` WRITE;
/*!40000 ALTER TABLE `crm_activities` DISABLE KEYS */;
/*!40000 ALTER TABLE `crm_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crm_leads`
--

DROP TABLE IF EXISTS `crm_leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_leads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(200) DEFAULT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `source` enum('website','referral','trade_show','cold_call','smart_glazier','walk_in','other') DEFAULT 'other',
  `status` enum('new','contacted','qualified','proposal','negotiation','won','lost') DEFAULT 'new',
  `estimated_value` decimal(12,2) DEFAULT NULL,
  `assigned_to` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `notes` text,
  `lost_reason` varchar(200) DEFAULT NULL,
  `won_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `crm_leads_ibfk_1` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `crm_leads_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crm_leads`
--

LOCK TABLES `crm_leads` WRITE;
/*!40000 ALTER TABLE `crm_leads` DISABLE KEYS */;
/*!40000 ALTER TABLE `crm_leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crm_pipeline`
--

DROP TABLE IF EXISTS `crm_pipeline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_pipeline` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `stages` json NOT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crm_pipeline`
--

LOCK TABLES `crm_pipeline` WRITE;
/*!40000 ALTER TABLE `crm_pipeline` DISABLE KEYS */;
INSERT INTO `crm_pipeline` VALUES (1,'Default Sales Pipeline','[\"New Lead\", \"Initial Contact\", \"Qualification\", \"Proposal Sent\", \"Negotiation\", \"Closed Won\", \"Closed Lost\"]',1,'2026-06-27 10:08:17');
/*!40000 ALTER TABLE `crm_pipeline` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `currencies`
--

DROP TABLE IF EXISTS `currencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `currencies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(3) NOT NULL,
  `name` varchar(50) NOT NULL,
  `symbol` varchar(5) DEFAULT '$',
  `exchange_rate` decimal(10,6) DEFAULT '1.000000',
  `is_base` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `currencies`
--

LOCK TABLES `currencies` WRITE;
/*!40000 ALTER TABLE `currencies` DISABLE KEYS */;
INSERT INTO `currencies` VALUES (1,'USD','US Dollar','$',1.000000,1,1,'2026-06-26 03:52:53'),(2,'CAD','Canadian Dollar','C$',0.730000,0,1,'2026-06-26 03:52:53'),(3,'EUR','Euro','€',1.080000,0,1,'2026-06-26 03:52:53'),(4,'GBP','British Pound','£',1.260000,0,1,'2026-06-26 03:52:53'),(5,'USD','US Dollar','$',1.000000,1,1,'2026-06-26 03:53:22'),(6,'CAD','Canadian Dollar','C$',0.730000,0,1,'2026-06-26 03:53:22'),(7,'EUR','Euro','€',1.080000,0,1,'2026-06-26 03:53:22'),(8,'GBP','British Pound','£',1.260000,0,1,'2026-06-26 03:53:22');
/*!40000 ALTER TABLE `currencies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_contacts`
--

DROP TABLE IF EXISTS `customer_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `title` varchar(50) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `customer_contacts_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_contacts`
--

LOCK TABLES `customer_contacts` WRITE;
/*!40000 ALTER TABLE `customer_contacts` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_deposits`
--

DROP TABLE IF EXISTS `customer_deposits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_deposits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `deposit_number` varchar(20) NOT NULL,
  `customer_id` int NOT NULL,
  `sales_order_id` int NOT NULL,
  `deposit_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` enum('check','wire','wire_transfer','credit_card','ach','cash') NOT NULL DEFAULT 'check',
  `reference_number` varchar(50) DEFAULT NULL,
  `bank_id` int DEFAULT NULL,
  `amount_applied` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('received','unapplied','applied','refunded','void') NOT NULL DEFAULT 'unapplied',
  `notes` text,
  `received_by` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `deposit_number` (`deposit_number`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_sales_order` (`sales_order_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_deposits`
--

LOCK TABLES `customer_deposits` WRITE;
/*!40000 ALTER TABLE `customer_deposits` DISABLE KEYS */;
INSERT INTO `customer_deposits` VALUES (1,'DEP-5584',1,3,'2026-06-25',500.00,'check','CHK-1001',NULL,0.00,'unapplied',NULL,1,'2026-06-26 00:11:48'),(2,'DEP-0591',1,3,'2026-06-26',500.00,'credit_card','CC-4567',NULL,0.00,'unapplied',NULL,1,'2026-06-26 00:20:04'),(3,'DEP-1002',2,8,'2026-06-26',500.00,'wire','WIRE-2026-001',NULL,0.00,'unapplied',NULL,1,'2026-06-26 23:50:09');
/*!40000 ALTER TABLE `customer_deposits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_payments`
--

DROP TABLE IF EXISTS `customer_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_number` varchar(20) NOT NULL,
  `customer_id` int NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('check','wire','ach','credit_card','cash') NOT NULL,
  `reference_number` varchar(50) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `bank_id` int DEFAULT NULL,
  `posted` tinyint(1) DEFAULT '0',
  `posted_date` datetime DEFAULT NULL,
  `gl_voucher_id` int DEFAULT NULL,
  `notes` text,
  `received_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `bank_account_id` int DEFAULT NULL,
  `status` enum('draft','posted','void') DEFAULT 'draft',
  `amount_applied` decimal(12,2) DEFAULT '0.00',
  `check_number` varchar(50) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_number` (`payment_number`),
  KEY `customer_id` (`customer_id`),
  KEY `bank_id` (`bank_id`),
  CONSTRAINT `customer_payments_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `customer_payments_ibfk_2` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_payments`
--

LOCK TABLES `customer_payments` WRITE;
/*!40000 ALTER TABLE `customer_payments` DISABLE KEYS */;
INSERT INTO `customer_payments` VALUES (1,'PMT-01001',1,'2026-06-25','check',NULL,449.95,NULL,0,NULL,NULL,NULL,1,'2026-06-25 23:40:04',1,'draft',0.00,NULL,NULL),(2,'PMT-01006',2,'2026-06-26','check','5001',1250.00,NULL,0,NULL,NULL,NULL,1,'2026-06-26 00:13:07',1,'posted',0.00,NULL,NULL),(3,'PMT-01007',2,'2026-06-26','check','5001',1250.00,NULL,0,NULL,NULL,NULL,1,'2026-06-26 00:13:24',1,'posted',0.00,NULL,NULL),(4,'PMT-01008',2,'2026-06-26','check','5001',1250.00,NULL,0,NULL,NULL,NULL,1,'2026-06-26 00:14:00',1,'posted',0.00,NULL,NULL),(5,'PMT-01009',2,'2026-06-26','check','CHK-9921',3320.00,NULL,0,NULL,NULL,NULL,1,'2026-06-26 02:38:32',NULL,'posted',0.00,NULL,NULL),(6,'PMT-01010',2,'2026-06-26','check','CHK-5501',3320.00,NULL,0,NULL,NULL,NULL,1,'2026-06-26 02:42:22',NULL,'posted',0.00,NULL,NULL),(7,'PMT-01011',1,'2026-06-26','check','',449.95,NULL,0,NULL,NULL,NULL,1,'2026-06-26 23:15:00',NULL,'posted',0.00,NULL,NULL),(8,'PMT-01012',2,'2026-06-26','wire','WIRE-PAY-001',925.00,NULL,0,NULL,NULL,NULL,1,'2026-06-26 23:53:40',NULL,'posted',0.00,NULL,NULL),(9,'PMT-01013',1,'2026-06-27','check','CHK-9999',475.00,NULL,0,NULL,NULL,NULL,1,'2026-06-27 13:14:41',NULL,'posted',0.00,NULL,NULL);
/*!40000 ALTER TABLE `customer_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_types`
--

DROP TABLE IF EXISTS `customer_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_types`
--

LOCK TABLES `customer_types` WRITE;
/*!40000 ALTER TABLE `customer_types` DISABLE KEYS */;
INSERT INTO `customer_types` VALUES (1,'Commercial',NULL,1),(2,'Residential',NULL,1),(3,'Contractor',NULL,1),(4,'Distributor',NULL,1),(5,'Government',NULL,1);
/*!40000 ALTER TABLE `customer_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_number` varchar(20) NOT NULL,
  `company_name` varchar(100) NOT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `bill_address1` varchar(100) DEFAULT NULL,
  `bill_address2` varchar(100) DEFAULT NULL,
  `bill_city` varchar(50) DEFAULT NULL,
  `bill_state` varchar(50) DEFAULT NULL,
  `bill_zip` varchar(20) DEFAULT NULL,
  `bill_country` varchar(50) DEFAULT 'USA',
  `ship_address1` varchar(100) DEFAULT NULL,
  `ship_address2` varchar(100) DEFAULT NULL,
  `ship_city` varchar(50) DEFAULT NULL,
  `ship_state` varchar(50) DEFAULT NULL,
  `ship_zip` varchar(20) DEFAULT NULL,
  `ship_country` varchar(50) DEFAULT 'USA',
  `phone` varchar(30) DEFAULT NULL,
  `fax` varchar(30) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(100) DEFAULT NULL,
  `customer_type_id` int DEFAULT NULL,
  `tax_group_id` int DEFAULT NULL,
  `payment_terms` varchar(50) DEFAULT 'Net 30',
  `credit_limit` decimal(12,2) DEFAULT '0.00',
  `current_balance` decimal(12,2) DEFAULT '0.00',
  `price_list_id` int DEFAULT NULL,
  `salesperson_id` int DEFAULT NULL,
  `carrier_id` int DEFAULT NULL,
  `tax_exempt` tinyint(1) DEFAULT '0',
  `tax_exempt_number` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `currency_code` varchar(3) DEFAULT 'USD',
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_number` (`customer_number`),
  KEY `customer_type_id` (`customer_type_id`),
  KEY `tax_group_id` (`tax_group_id`),
  KEY `price_list_id` (`price_list_id`),
  KEY `salesperson_id` (`salesperson_id`),
  KEY `carrier_id` (`carrier_id`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`customer_type_id`) REFERENCES `customer_types` (`id`),
  CONSTRAINT `customers_ibfk_2` FOREIGN KEY (`tax_group_id`) REFERENCES `tax_groups` (`id`),
  CONSTRAINT `customers_ibfk_3` FOREIGN KEY (`price_list_id`) REFERENCES `price_lists` (`id`),
  CONSTRAINT `customers_ibfk_4` FOREIGN KEY (`salesperson_id`) REFERENCES `salespeople` (`id`),
  CONSTRAINT `customers_ibfk_5` FOREIGN KEY (`carrier_id`) REFERENCES `carriers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'C-10001','ABC Glass Distributors','John Smith','123 Main St',NULL,'New York','NY','10001','USA',NULL,NULL,NULL,NULL,NULL,'USA','212-555-0100',NULL,'john@abcglass.com',NULL,NULL,NULL,'Net 30',50000.00,0.00,NULL,NULL,NULL,0,NULL,1,NULL,'2026-06-25 23:37:19','2026-06-25 23:37:19','USD'),(2,'C-10002','ABC Glass Corp','John Smith','123 Main St',NULL,'New York','NY','10001','USA',NULL,NULL,NULL,NULL,NULL,'USA','555-0101',NULL,'john@abcglass.com',NULL,NULL,NULL,'Net 30',0.00,0.00,NULL,NULL,NULL,0,NULL,1,NULL,'2026-06-26 00:10:43','2026-06-26 00:10:43','USD');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cut_plan_pieces`
--

DROP TABLE IF EXISTS `cut_plan_pieces`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cut_plan_pieces` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cut_plan_id` int NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `sales_order_id` int DEFAULT NULL,
  `item_id` int DEFAULT NULL,
  `piece_width` decimal(10,4) NOT NULL,
  `piece_height` decimal(10,4) NOT NULL,
  `x_position` decimal(10,4) NOT NULL DEFAULT '0.0000' COMMENT 'position on sheet',
  `y_position` decimal(10,4) NOT NULL DEFAULT '0.0000' COMMENT 'position on sheet',
  `rotated` tinyint(1) DEFAULT '0',
  `label` varchar(200) DEFAULT NULL,
  `customer_name` varchar(200) DEFAULT NULL,
  `order_number` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cut_plan_id` (`cut_plan_id`),
  CONSTRAINT `cut_plan_pieces_ibfk_1` FOREIGN KEY (`cut_plan_id`) REFERENCES `cut_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cut_plan_pieces`
--

LOCK TABLES `cut_plan_pieces` WRITE;
/*!40000 ALTER TABLE `cut_plan_pieces` DISABLE KEYS */;
/*!40000 ALTER TABLE `cut_plan_pieces` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cut_plan_remnants`
--

DROP TABLE IF EXISTS `cut_plan_remnants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cut_plan_remnants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cut_plan_id` int NOT NULL,
  `width` decimal(10,4) NOT NULL,
  `height` decimal(10,4) NOT NULL,
  `x_position` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `y_position` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `disposition` varchar(20) DEFAULT 'keep' COMMENT 'keep, scrap, too_small',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cut_plan_id` (`cut_plan_id`),
  CONSTRAINT `cut_plan_remnants_ibfk_1` FOREIGN KEY (`cut_plan_id`) REFERENCES `cut_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cut_plan_remnants`
--

LOCK TABLES `cut_plan_remnants` WRITE;
/*!40000 ALTER TABLE `cut_plan_remnants` DISABLE KEYS */;
/*!40000 ALTER TABLE `cut_plan_remnants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cut_plans`
--

DROP TABLE IF EXISTS `cut_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cut_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan_number` varchar(30) NOT NULL,
  `plan_date` date NOT NULL,
  `glass_type` varchar(50) NOT NULL,
  `thickness` varchar(20) NOT NULL,
  `source_type` varchar(20) NOT NULL COMMENT 'sheet or remnant',
  `source_sheet_id` int DEFAULT NULL,
  `source_remnant_id` int DEFAULT NULL,
  `sheet_width` decimal(10,4) NOT NULL,
  `sheet_height` decimal(10,4) NOT NULL,
  `status` varchar(20) DEFAULT 'draft' COMMENT 'draft, approved, cutting, completed',
  `total_pieces` int DEFAULT '0',
  `utilization_pct` decimal(5,2) DEFAULT '0.00',
  `waste_pct` decimal(5,2) DEFAULT '0.00',
  `waste_sqft` decimal(10,2) DEFAULT '0.00',
  `operator` varchar(100) DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `source_sheet_id` (`source_sheet_id`),
  KEY `source_remnant_id` (`source_remnant_id`),
  CONSTRAINT `cut_plans_ibfk_1` FOREIGN KEY (`source_sheet_id`) REFERENCES `sheet_stock` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cut_plans_ibfk_2` FOREIGN KEY (`source_remnant_id`) REFERENCES `remnants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cut_plans`
--

LOCK TABLES `cut_plans` WRITE;
/*!40000 ALTER TABLE `cut_plans` DISABLE KEYS */;
/*!40000 ALTER TABLE `cut_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `debit_memos`
--

DROP TABLE IF EXISTS `debit_memos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `debit_memos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `memo_number` varchar(20) NOT NULL,
  `vendor_id` int NOT NULL,
  `ap_invoice_id` int DEFAULT NULL,
  `memo_date` date NOT NULL,
  `reason` enum('return','shortage','damaged','pricing_error','other') NOT NULL DEFAULT 'other',
  `reason_notes` text,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount_applied` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('draft','posted','applied','void') NOT NULL DEFAULT 'draft',
  `created_by` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `memo_number` (`memo_number`),
  KEY `idx_vendor` (`vendor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `debit_memos`
--

LOCK TABLES `debit_memos` WRITE;
/*!40000 ALTER TABLE `debit_memos` DISABLE KEYS */;
/*!40000 ALTER TABLE `debit_memos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(50) NOT NULL,
  `manager` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (1,'ADMIN','Administration',NULL,1,'2026-06-26 03:52:53'),(2,'SALES','Sales',NULL,1,'2026-06-26 03:52:53'),(3,'PURCH','Purchasing',NULL,1,'2026-06-26 03:52:53'),(4,'PROD','Production',NULL,1,'2026-06-26 03:52:53'),(5,'QC','Quality Control',NULL,1,'2026-06-26 03:52:53'),(6,'SHIP','Shipping & Receiving',NULL,1,'2026-06-26 03:52:53'),(7,'ACCT','Accounting',NULL,1,'2026-06-26 03:52:53'),(8,'MAINT','Maintenance',NULL,1,'2026-06-26 03:52:53');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dispatch_racks`
--

DROP TABLE IF EXISTS `dispatch_racks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispatch_racks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rack_number` varchar(20) NOT NULL,
  `rack_type` enum('a-frame','l-rack','stillage','flat-bed','custom') DEFAULT 'a-frame',
  `capacity_sqft` decimal(8,2) DEFAULT NULL,
  `capacity_pieces` int DEFAULT NULL,
  `max_weight_lbs` decimal(8,2) DEFAULT NULL,
  `max_height_inches` decimal(6,2) DEFAULT NULL,
  `max_width_inches` decimal(6,2) DEFAULT NULL,
  `status` enum('available','loaded','in-transit','at-customer','maintenance','retired') DEFAULT 'available',
  `current_location` varchar(200) DEFAULT NULL,
  `assigned_route_id` int DEFAULT NULL,
  `active_loads` int DEFAULT '0',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rack_number` (`rack_number`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dispatch_racks`
--

LOCK TABLES `dispatch_racks` WRITE;
/*!40000 ALTER TABLE `dispatch_racks` DISABLE KEYS */;
INSERT INTO `dispatch_racks` VALUES (1,'RACK-001','a-frame',120.00,20,2000.00,96.00,144.00,'available','Warehouse',NULL,0,NULL,'2026-06-27 10:20:34','2026-06-27 10:20:34'),(2,'RACK-002','a-frame',120.00,20,2000.00,96.00,144.00,'available','Warehouse',NULL,0,NULL,'2026-06-27 10:20:34','2026-06-27 10:20:34'),(3,'RACK-003','l-rack',80.00,15,1500.00,72.00,120.00,'available','Warehouse',NULL,0,NULL,'2026-06-27 10:20:34','2026-06-27 10:20:34'),(4,'RACK-004','a-frame',120.00,20,2000.00,96.00,144.00,'loaded','Production Floor',NULL,0,NULL,'2026-06-27 10:20:34','2026-06-27 10:20:34'),(5,'RACK-005','stillage',60.00,10,1000.00,48.00,96.00,'available','Warehouse',NULL,0,NULL,'2026-06-27 10:20:34','2026-06-27 10:20:34'),(6,'RACK-006','a-frame',120.00,20,2000.00,96.00,144.00,'in-transit','En route - Job 1042',NULL,0,NULL,'2026-06-27 10:20:34','2026-06-27 10:20:34'),(7,'RACK-007','flat-bed',200.00,30,3000.00,120.00,180.00,'at-customer','ABC Construction',NULL,0,NULL,'2026-06-27 10:20:34','2026-06-27 10:20:34'),(8,'RACK-008','a-frame',120.00,20,2000.00,96.00,144.00,'maintenance','Shop',NULL,0,NULL,'2026-06-27 10:20:34','2026-06-27 10:20:34');
/*!40000 ALTER TABLE `dispatch_racks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dispatch_routes`
--

DROP TABLE IF EXISTS `dispatch_routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispatch_routes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `route_number` varchar(30) NOT NULL,
  `route_date` date NOT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `vehicle` varchar(100) DEFAULT NULL,
  `status` enum('planning','confirmed','in-progress','completed','cancelled') DEFAULT 'planning',
  `estimated_start` time DEFAULT NULL,
  `actual_start` time DEFAULT NULL,
  `estimated_end` time DEFAULT NULL,
  `actual_end` time DEFAULT NULL,
  `total_stops` int DEFAULT '0',
  `total_miles` decimal(10,2) DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `route_number` (`route_number`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `dispatch_routes_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dispatch_routes`
--

LOCK TABLES `dispatch_routes` WRITE;
/*!40000 ALTER TABLE `dispatch_routes` DISABLE KEYS */;
/*!40000 ALTER TABLE `dispatch_routes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dispatch_stops`
--

DROP TABLE IF EXISTS `dispatch_stops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispatch_stops` (
  `id` int NOT NULL AUTO_INCREMENT,
  `route_id` int NOT NULL,
  `stop_sequence` int NOT NULL,
  `shipment_id` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip` varchar(20) DEFAULT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `contact_phone` varchar(30) DEFAULT NULL,
  `estimated_arrival` time DEFAULT NULL,
  `actual_arrival` time DEFAULT NULL,
  `status` enum('pending','arrived','delivered','failed','skipped') DEFAULT 'pending',
  `delivery_notes` text,
  `signature_file` varchar(255) DEFAULT NULL,
  `photo_files` json DEFAULT NULL,
  `rack_ids` json DEFAULT NULL,
  `racks_returned` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `route_id` (`route_id`),
  KEY `shipment_id` (`shipment_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `dispatch_stops_ibfk_1` FOREIGN KEY (`route_id`) REFERENCES `dispatch_routes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dispatch_stops_ibfk_2` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `dispatch_stops_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dispatch_stops`
--

LOCK TABLES `dispatch_stops` WRITE;
/*!40000 ALTER TABLE `dispatch_stops` DISABLE KEYS */;
/*!40000 ALTER TABLE `dispatch_stops` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_attachments`
--

DROP TABLE IF EXISTS `document_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `reference_type` enum('sales_order','work_order','purchase_order','shipment','invoice','customer','vendor','quote','rack','dispatch') NOT NULL,
  `reference_id` int NOT NULL,
  `category` enum('drawing','dxf','photo','document','email','signature','other') DEFAULT 'document',
  `uploaded_by` int DEFAULT NULL,
  `description` text,
  `is_from_smart_glazier` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `uploaded_by` (`uploaded_by`),
  CONSTRAINT `document_attachments_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_attachments`
--

LOCK TABLES `document_attachments` WRITE;
/*!40000 ALTER TABLE `document_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_files`
--

DROP TABLE IF EXISTS `document_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `document_type` enum('quote','sales_order','work_order') NOT NULL,
  `document_id` int NOT NULL,
  `line_id` int DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_size` int DEFAULT '0',
  `mime_type` varchar(100) DEFAULT '',
  `machine_tag` enum('cutting_table','cnc_machine','waterjet','edge_polisher','shop_drawing','reference','other') DEFAULT 'other',
  `description` varchar(500) DEFAULT '',
  `uploaded_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_doc` (`document_type`,`document_id`),
  KEY `idx_line` (`document_type`,`document_id`,`line_id`),
  KEY `idx_machine` (`machine_tag`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_files`
--

LOCK TABLES `document_files` WRITE;
/*!40000 ALTER TABLE `document_files` DISABLE KEYS */;
INSERT INTO `document_files` VALUES (1,'quote',1,1,'quote-1-1782509106645-227816907.dxf','test.dxf',41,'application/octet-stream','cnc_machine','Test CNC file',1,'2026-06-26 21:25:06'),(3,'sales_order',1,1,'sales_order-1-1782509334648-490921974.dxf','test.dxf',41,'application/octet-stream','cnc_machine','Test CNC file',1,'2026-06-26 21:28:54'),(4,'work_order',1,NULL,'work_order-1-1782514327367-468247963.txt','test_cnc_file.txt',17,'text/plain','cnc_machine','Test CNC program',1,'2026-06-26 22:52:07');
/*!40000 ALTER TABLE `document_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_templates`
--

DROP TABLE IF EXISTS `document_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `doc_type` enum('quote','sales_order','invoice','packing_slip','bill_of_lading','purchase_order','work_order','receipt_label','shipping_label','product_label','check','statement') NOT NULL,
  `document_type` varchar(50) DEFAULT NULL,
  `category` varchar(50) DEFAULT 'general',
  `template_html` text,
  `pdf_template` longtext,
  `subject_template` varchar(500) DEFAULT NULL,
  `body_template` text,
  `is_default` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_templates`
--

LOCK TABLES `document_templates` WRITE;
/*!40000 ALTER TABLE `document_templates` DISABLE KEYS */;
INSERT INTO `document_templates` VALUES (1,'Purchase Order','purchase_order','purchase_order','purchasing',NULL,NULL,'Purchase Order {{po_number}} - {{company.name}}','<p>Dear {{vendor_name}},</p><p>Please find attached Purchase Order <strong>{{po_number}}</strong>.</p><p>Kindly confirm receipt and expected delivery date.</p><p>Thank you,<br>{{company.name}}<br>{{company.phone}}</p>',0,1,'2026-06-26 17:16:54','2026-06-26 17:16:54'),(2,'Quote','quote','quote','sales',NULL,NULL,'Quote {{quote_number}} - {{company.name}}','<p>Dear {{customer_name}},</p><p>Please find attached our Quote <strong>{{quote_number}}</strong>.</p><p>This quote is valid for 30 days.</p><p>Best regards,<br>{{company.name}}<br>{{company.phone}}</p>',0,1,'2026-06-26 17:16:54','2026-06-26 17:16:54'),(3,'Sales Order','sales_order','sales_order','sales',NULL,NULL,'Order Confirmation {{order_number}} - {{company.name}}','<p>Dear {{customer_name}},</p><p>This confirms your order <strong>{{order_number}}</strong> has been received.</p><p>We will notify you when your order ships.</p><p>Thank you,<br>{{company.name}}</p>',0,1,'2026-06-26 17:16:54','2026-06-26 17:16:54'),(4,'Invoice','invoice','ar_invoice','sales',NULL,NULL,'Invoice {{invoice_number}} - {{company.name}}','<p>Dear {{customer_name}},</p><p>Please find attached Invoice <strong>{{invoice_number}}</strong>.</p><p>Payment is due by {{due_date}}.</p><p>Thank you,<br>{{company.name}}<br>{{company.phone}}</p>',0,1,'2026-06-26 17:16:54','2026-06-26 17:16:54'),(5,'Packing Slip','packing_slip','packing_slip','sales',NULL,NULL,'Shipment Notification - {{company.name}}','<p>Dear {{customer_name}},</p><p>Your order has been shipped.</p><p>Thank you,<br>{{company.name}}</p>',0,1,'2026-06-26 17:16:54','2026-06-26 17:16:54'),(6,'Work Order','work_order','work_order','manufacturing',NULL,NULL,'Work Order {{wo_number}}','',0,1,'2026-06-26 17:16:54','2026-06-26 17:16:54'),(7,'Receiving Report','receipt_label','receiving_report','purchasing',NULL,NULL,'Receiving Report {{receipt_number}}','',0,1,'2026-06-26 17:16:54','2026-06-26 17:16:54');
/*!40000 ALTER TABLE `document_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `document_name` varchar(200) DEFAULT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `version` int DEFAULT '1',
  `uploaded_by` int DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_log`
--

DROP TABLE IF EXISTS `email_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `document_type` varchar(50) NOT NULL,
  `document_id` int NOT NULL,
  `to_address` varchar(255) NOT NULL,
  `cc_address` varchar(255) DEFAULT NULL,
  `subject` varchar(255) NOT NULL,
  `sent_by` int DEFAULT NULL,
  `sent_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `message_id` varchar(255) DEFAULT NULL,
  `status` enum('sent','failed','bounced') DEFAULT 'sent',
  `error_message` text,
  PRIMARY KEY (`id`),
  KEY `idx_document` (`document_type`,`document_id`),
  KEY `idx_sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_log`
--

LOCK TABLES `email_log` WRITE;
/*!40000 ALTER TABLE `email_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_queue`
--

DROP TABLE IF EXISTS `email_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_queue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `to_email` varchar(255) NOT NULL,
  `to_name` varchar(100) DEFAULT NULL,
  `cc_email` varchar(255) DEFAULT NULL,
  `bcc_email` varchar(255) DEFAULT NULL,
  `subject` varchar(255) NOT NULL,
  `body_html` text NOT NULL,
  `body_text` text,
  `template_id` int DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `attachments` json DEFAULT NULL,
  `status` enum('queued','sending','sent','failed','cancelled') DEFAULT 'queued',
  `attempts` int DEFAULT '0',
  `max_attempts` int DEFAULT '3',
  `error_message` text,
  `sent_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `email_queue_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `email_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `email_queue_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_queue`
--

LOCK TABLES `email_queue` WRITE;
/*!40000 ALTER TABLE `email_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_templates`
--

DROP TABLE IF EXISTS `email_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_name` varchar(100) NOT NULL,
  `template_type` enum('invoice','quote','order_confirmation','shipment_notification','payment_receipt','overdue_reminder','welcome','custom') NOT NULL,
  `subject` varchar(255) NOT NULL,
  `body_html` text NOT NULL,
  `body_text` text,
  `variables` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_templates`
--

LOCK TABLES `email_templates` WRITE;
/*!40000 ALTER TABLE `email_templates` DISABLE KEYS */;
INSERT INTO `email_templates` VALUES (1,'Invoice Email','invoice','Invoice {{invoice_number}} from Max TA Group','<h2>Invoice {{invoice_number}}</h2><p>Dear {{customer_name}},</p><p>Please find attached invoice {{invoice_number}} for {{total}} due on {{due_date}}.</p><p>Thank you for your business.</p><p>Max TA Group LLC</p>',NULL,'[\"invoice_number\", \"customer_name\", \"total\", \"due_date\"]',1,'2026-06-27 10:08:17','2026-06-27 10:08:17'),(2,'Quote Email','quote','Quote {{quote_number}} from Max TA Group','<h2>Quote {{quote_number}}</h2><p>Dear {{customer_name}},</p><p>Thank you for your inquiry. Please find our quote attached.</p><p>This quote is valid for 30 days.</p><p>Max TA Group LLC</p>',NULL,'[\"quote_number\", \"customer_name\", \"total\"]',1,'2026-06-27 10:08:17','2026-06-27 10:08:17'),(3,'Order Confirmation','order_confirmation','Order Confirmation {{order_number}}','<h2>Order Confirmed</h2><p>Dear {{customer_name}},</p><p>Your order {{order_number}} has been confirmed and is in production.</p><p>Estimated delivery: {{estimated_delivery}}</p><p>Max TA Group LLC</p>',NULL,'[\"order_number\", \"customer_name\", \"estimated_delivery\"]',1,'2026-06-27 10:08:17','2026-06-27 10:08:17'),(4,'Shipment Notification','shipment_notification','Your Order Has Shipped - {{shipment_number}}','<h2>Shipment Notification</h2><p>Dear {{customer_name}},</p><p>Your order has been shipped (Shipment: {{shipment_number}}).</p><p>Tracking: {{tracking_number}}</p><p>Max TA Group LLC</p>',NULL,'[\"shipment_number\", \"customer_name\", \"tracking_number\"]',1,'2026-06-27 10:08:17','2026-06-27 10:08:17'),(5,'Payment Receipt','payment_receipt','Payment Receipt - {{payment_number}}','<h2>Payment Received</h2><p>Dear {{customer_name}},</p><p>We have received your payment of {{amount}}. Thank you!</p><p>Max TA Group LLC</p>',NULL,'[\"payment_number\", \"customer_name\", \"amount\"]',1,'2026-06-27 10:08:17','2026-06-27 10:08:17'),(6,'Overdue Reminder','overdue_reminder','Payment Reminder - Invoice {{invoice_number}} Overdue','<h2>Payment Reminder</h2><p>Dear {{customer_name}},</p><p>Invoice {{invoice_number}} for {{total}} was due on {{due_date}} and is now {{days_overdue}} days overdue.</p><p>Please remit payment at your earliest convenience.</p><p>Max TA Group LLC</p>',NULL,'[\"invoice_number\", \"customer_name\", \"total\", \"due_date\", \"days_overdue\"]',1,'2026-06-27 10:08:17','2026-06-27 10:08:17'),(7,'Invoice Email','invoice','Invoice from Max TA Group','<h2>Invoice</h2><p>Dear Customer,</p><p>Please find attached your invoice.</p><p>Thank you for your business!</p><p>Max TA Group LLC</p>',NULL,NULL,1,'2026-06-27 10:20:34','2026-06-27 10:20:34'),(8,'Order Confirmation','order_confirmation','Order Confirmation','<h2>Order Confirmed</h2><p>Dear Customer,</p><p>Your order has been confirmed and is now in production.</p><p>Thank you!</p>',NULL,NULL,1,'2026-06-27 10:20:34','2026-06-27 10:20:34'),(9,'Shipment Notification','shipment_notification','Your Order Has Shipped','<h2>Shipment Notification</h2><p>Dear Customer,</p><p>Your order has been shipped.</p><p>Expected delivery within 3-5 business days.</p>',NULL,NULL,1,'2026-06-27 10:20:34','2026-06-27 10:20:34'),(10,'Overdue Reminder','overdue_reminder','Payment Reminder','<h2>Payment Reminder</h2><p>Dear Customer,</p><p>This is a friendly reminder that your invoice is past due.</p><p>Please arrange payment at your earliest convenience.</p>',NULL,NULL,1,'2026-06-27 10:20:34','2026-06-27 10:20:34'),(11,'Quote Follow-up','quote','Following Up on Your Quote','<h2>Quote Follow-up</h2><p>Dear Customer,</p><p>We wanted to follow up on the quote we sent recently.</p><p>Please let us know if you have any questions.</p>',NULL,NULL,1,'2026-06-27 10:20:34','2026-06-27 10:20:34');
/*!40000 ALTER TABLE `email_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exchange_rates`
--

DROP TABLE IF EXISTS `exchange_rates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exchange_rates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `from_currency` varchar(3) NOT NULL DEFAULT 'USD',
  `to_currency` varchar(3) NOT NULL,
  `rate` decimal(12,6) NOT NULL,
  `effective_date` date NOT NULL,
  `source` varchar(50) DEFAULT 'manual',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_currency_date` (`from_currency`,`to_currency`,`effective_date`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exchange_rates`
--

LOCK TABLES `exchange_rates` WRITE;
/*!40000 ALTER TABLE `exchange_rates` DISABLE KEYS */;
INSERT INTO `exchange_rates` VALUES (1,'USD','CAD',1.360000,'2026-06-27','manual','2026-06-27 18:53:30'),(2,'USD','EUR',0.920000,'2026-06-27','manual','2026-06-27 18:53:30'),(3,'USD','GBP',0.790000,'2026-06-27','manual','2026-06-27 18:53:30'),(4,'USD','MXN',17.200000,'2026-06-27','manual','2026-06-27 18:53:30');
/*!40000 ALTER TABLE `exchange_rates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fabrication_charges`
--

DROP TABLE IF EXISTS `fabrication_charges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fabrication_charges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(50) NOT NULL COMMENT 'Edgework, Holes, Notches, Cutouts, Tempering, Coating, Shape, Other',
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `pricing_method` enum('per_hole','per_linear_foot','per_piece','per_sq_ft','per_notch','per_cutout','per_corner') NOT NULL,
  `default_rate` decimal(10,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fabrication_charges`
--

LOCK TABLES `fabrication_charges` WRITE;
/*!40000 ALTER TABLE `fabrication_charges` DISABLE KEYS */;
INSERT INTO `fabrication_charges` VALUES (1,'Edgework','Seamed Edge','Basic safety grind - removes sharp edges','per_linear_foot',1.50,1,1,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(2,'Edgework','Flat Polish','Smooth glossy flat edge finish','per_linear_foot',3.50,1,2,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(3,'Edgework','Pencil Polish','Rounded/pencil edge finish','per_linear_foot',4.00,1,3,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(4,'Edgework','Beveled Edge','Angled decorative bevel edge','per_linear_foot',7.00,1,4,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(5,'Edgework','Mitered Edge','45-degree cut for joining panels','per_linear_foot',12.00,1,5,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(11,'Notches','Custom Notch','Non-standard notch shape or size','per_notch',40.00,1,22,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(12,'Cutouts','Square Cutout','Internal square/rectangular cutout','per_cutout',45.00,1,30,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(13,'Cutouts','Round Cutout','Internal circular cutout','per_cutout',50.00,1,31,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(14,'Cutouts','Custom Cutout','Complex internal cutout shape','per_cutout',75.00,1,32,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(16,'Tempering','Heat Soak Test','Additional heat soak after tempering','per_piece',35.00,1,41,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(17,'Coating','Hydrophobic Coating','Water/soap repellent surface treatment','per_sq_ft',3.00,1,50,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(18,'Coating','Low-E Coating','Energy-efficient reflective coating','per_sq_ft',5.00,1,51,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(19,'Shape','Radius Corner','Rounded corner cut','per_corner',15.00,1,60,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(20,'Shape','Custom Shape Cut','Non-rectangular shape (arch, circle, etc.)','per_piece',50.00,1,61,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(21,'Other','Sandblasting','Frosted/etched surface treatment','per_sq_ft',6.00,1,70,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(22,'Other','V-Groove','Decorative V-groove line cut','per_linear_foot',5.00,1,71,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(23,'Other','Ceramic Frit','Ceramic paint application','per_sq_ft',8.00,1,72,'2026-06-26 21:08:22','2026-06-26 21:08:22'),(24,'Holes','Standard Round Hole','Standard hole for handles/hinges (up to 1\" diameter)','per_hole',12.00,1,1,'2026-06-26 21:16:33','2026-06-26 21:16:33'),(25,'Holes','Large Round Hole','Hole over 1\" diameter','per_hole',18.00,1,2,'2026-06-26 21:16:33','2026-06-26 21:16:33'),(26,'Holes','Countersink Hole','Countersunk hole for flush-mount hardware','per_hole',22.00,1,3,'2026-06-26 21:16:33','2026-06-26 21:16:33'),(32,'Notches','Standard Hinge Notch','Rectangular notch for standard hinge','per_notch',25.00,1,1,'2026-06-26 21:16:33','2026-06-26 21:16:33'),(33,'Notches','U-Channel Notch','U-shaped notch for clips/channels','per_notch',20.00,1,2,'2026-06-26 21:16:33','2026-06-26 21:16:33'),(35,'Cutouts','Standard Cutout','Internal rectangular cutout','per_cutout',45.00,1,1,'2026-06-26 21:16:33','2026-06-26 21:16:33'),(36,'Cutouts','Radius Corner Cutout','Cutout with rounded corners','per_cutout',55.00,1,2,'2026-06-26 21:16:33','2026-06-26 21:16:33'),(37,'Tempering','Standard Temper','Heat-strengthened tempering per piece','per_piece',35.00,1,1,'2026-06-26 21:16:33','2026-06-26 21:16:33'),(40,'Coating','Acid Etch/Frosting','Acid-etched frosted finish','per_sq_ft',6.00,1,2,'2026-06-26 21:16:33','2026-06-26 21:16:33');
/*!40000 ALTER TABLE `fabrication_charges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gl_accounts`
--

DROP TABLE IF EXISTS `gl_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gl_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_number` varchar(20) NOT NULL,
  `account_name` varchar(100) NOT NULL,
  `account_type` enum('asset','liability','equity','revenue','expense','cogs') NOT NULL,
  `sub_type` varchar(50) DEFAULT NULL,
  `parent_account_id` int DEFAULT NULL,
  `normal_balance` enum('debit','credit') NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `description` varchar(255) DEFAULT NULL,
  `current_balance` decimal(14,2) DEFAULT '0.00',
  `balance` decimal(14,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_number` (`account_number`),
  KEY `parent_account_id` (`parent_account_id`),
  CONSTRAINT `gl_accounts_ibfk_1` FOREIGN KEY (`parent_account_id`) REFERENCES `gl_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gl_accounts`
--

LOCK TABLES `gl_accounts` WRITE;
/*!40000 ALTER TABLE `gl_accounts` DISABLE KEYS */;
INSERT INTO `gl_accounts` VALUES (1,'1000','Cash - Operating','asset',NULL,NULL,'debit',1,NULL,0.00,1849.95),(2,'1100','Accounts Receivable','asset',NULL,NULL,'debit',1,NULL,0.00,-449.95),(3,'1200','Inventory - Raw Materials','asset',NULL,NULL,'debit',1,NULL,0.00,-236.25),(4,'1210','Inventory - Work in Progress','asset',NULL,NULL,'debit',1,NULL,0.00,11.25),(5,'1220','Inventory - Finished Goods','asset',NULL,NULL,'debit',1,NULL,0.00,315.00),(6,'1500','Fixed Assets','asset',NULL,NULL,'debit',1,NULL,0.00,0.00),(7,'2000','Accounts Payable','liability',NULL,NULL,'credit',1,NULL,0.00,-225.00),(8,'2100','Accrued Liabilities','liability',NULL,NULL,'credit',1,NULL,0.00,0.00),(9,'2200','Sales Tax Payable','liability',NULL,NULL,'credit',1,NULL,0.00,0.00),(10,'3000','Common Stock','equity',NULL,NULL,'credit',1,NULL,0.00,90.00),(11,'3100','Retained Earnings','equity',NULL,NULL,'credit',1,NULL,0.00,0.00),(12,'4000','Sales Revenue','revenue',NULL,NULL,'credit',1,NULL,0.00,450.00),(13,'4100','Freight Revenue','revenue',NULL,NULL,'credit',1,NULL,0.00,0.00),(14,'5000','Cost of Goods Sold','cogs',NULL,NULL,'debit',1,NULL,0.00,45.00),(15,'5010','Material Cost Variance','cogs',NULL,NULL,'debit',1,NULL,0.00,0.00),(16,'5020','Labor Cost Variance','cogs',NULL,NULL,'debit',1,NULL,0.00,0.00),(17,'5100','Direct Labor','cogs',NULL,NULL,'debit',1,NULL,0.00,0.00),(18,'5200','Manufacturing Overhead','cogs',NULL,NULL,'debit',1,NULL,0.00,0.00),(19,'6000','Salaries & Wages','expense',NULL,NULL,'debit',1,NULL,0.00,0.00),(20,'6100','Rent Expense','expense',NULL,NULL,'debit',1,NULL,0.00,0.00),(21,'6200','Utilities Expense','expense',NULL,NULL,'debit',1,NULL,0.00,0.00),(22,'6600','Shipping Expense','expense',NULL,NULL,'debit',1,NULL,0.00,0.00),(23,'6700','Commission Expense','expense',NULL,NULL,'debit',1,NULL,0.00,0.00),(25,'1300','Finished Goods Inventory','asset',NULL,NULL,'debit',1,NULL,0.00,0.00),(26,'1350','Work in Progress','asset',NULL,NULL,'debit',1,NULL,0.00,0.00);
/*!40000 ALTER TABLE `gl_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gl_budget`
--

DROP TABLE IF EXISTS `gl_budget`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gl_budget` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gl_account_id` int NOT NULL,
  `period_id` int NOT NULL,
  `budget_amount` decimal(14,2) DEFAULT '0.00',
  `actual_amount` decimal(14,2) DEFAULT '0.00',
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `gl_account_id` (`gl_account_id`),
  KEY `period_id` (`period_id`),
  CONSTRAINT `gl_budget_ibfk_1` FOREIGN KEY (`gl_account_id`) REFERENCES `gl_accounts` (`id`),
  CONSTRAINT `gl_budget_ibfk_2` FOREIGN KEY (`period_id`) REFERENCES `accounting_periods` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gl_budget`
--

LOCK TABLES `gl_budget` WRITE;
/*!40000 ALTER TABLE `gl_budget` DISABLE KEYS */;
/*!40000 ALTER TABLE `gl_budget` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gl_transactions`
--

DROP TABLE IF EXISTS `gl_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gl_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gl_account_id` int NOT NULL,
  `transaction_date` date NOT NULL,
  `period` varchar(20) DEFAULT NULL,
  `debit` decimal(14,2) DEFAULT '0.00',
  `credit` decimal(14,2) DEFAULT '0.00',
  `source_type` varchar(50) DEFAULT NULL,
  `source_id` int DEFAULT NULL,
  `memo` varchar(255) DEFAULT NULL,
  `posted_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `gl_account_id` (`gl_account_id`),
  KEY `idx_gl_source` (`source_type`,`source_id`),
  KEY `idx_gl_date` (`transaction_date`),
  CONSTRAINT `gl_transactions_ibfk_1` FOREIGN KEY (`gl_account_id`) REFERENCES `gl_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gl_transactions`
--

LOCK TABLES `gl_transactions` WRITE;
/*!40000 ALTER TABLE `gl_transactions` DISABLE KEYS */;
INSERT INTO `gl_transactions` VALUES (1,1,'2026-06-26','6-2026',449.95,0.00,'customer_payment',1,'Customer payment PMT-01011 for INV-10002',1,'2026-06-26 23:15:01'),(2,2,'2026-06-26','6-2026',0.00,449.95,'customer_payment',1,'Customer payment PMT-01011 for INV-10002',1,'2026-06-26 23:15:01'),(3,2,'2026-06-26','6-2026',925.00,0.00,'ar_invoice',5,'AR Invoice INV-10009 posted',1,'2026-06-26 23:53:40'),(4,12,'2026-06-26','6-2026',0.00,925.00,'ar_invoice',5,'AR Invoice INV-10009 posted',1,'2026-06-26 23:53:40'),(5,1,'2026-06-26','6-2026',925.00,0.00,'customer_payment',5,'Customer payment PMT-01012 for INV-10009',1,'2026-06-26 23:53:40'),(6,2,'2026-06-26','6-2026',0.00,925.00,'customer_payment',5,'Customer payment PMT-01012 for INV-10009',1,'2026-06-26 23:53:40'),(7,2,'2026-06-27','6-2026',475.00,0.00,'ar_invoice',7,'AR Invoice INV-10011 posted',1,'2026-06-27 13:14:41'),(8,12,'2026-06-27','6-2026',0.00,475.00,'ar_invoice',7,'AR Invoice INV-10011 posted',1,'2026-06-27 13:14:41'),(9,1,'2026-06-27','6-2026',475.00,0.00,'customer_payment',9,'Customer payment PMT-01013 for INV-10011',1,'2026-06-27 13:14:41'),(10,2,'2026-06-27','6-2026',0.00,475.00,'customer_payment',9,'Customer payment PMT-01013 for INV-10011',1,'2026-06-27 13:14:41'),(11,2,'2026-06-27','6-2026',100.00,0.00,'ar_invoice',8,'AR Invoice INV-10012 posted',1,'2026-06-27 13:14:41'),(12,12,'2026-06-27','6-2026',0.00,100.00,'ar_invoice',8,'AR Invoice INV-10012 posted',1,'2026-06-27 13:14:41'),(13,12,'2026-06-27','6-2026',100.00,0.00,'ar_invoice_void',8,'VOID - AR Invoice INV-10012 reversed',1,'2026-06-27 13:14:41'),(14,2,'2026-06-27','6-2026',0.00,100.00,'ar_invoice_void',8,'VOID - AR Invoice INV-10012 reversed',1,'2026-06-27 13:14:41'),(15,3,'2026-06-27','6-2026',0.00,236.25,'wo_material_issue',19,'Material backflush - WO WO-20027 Receipt WOR-01003',1,'2026-06-27 13:15:41'),(16,4,'2026-06-27','6-2026',236.25,0.00,'wo_material_issue',19,'Material backflush - WO WO-20027 Receipt WOR-01003',1,'2026-06-27 13:15:41'),(17,5,'2026-06-27','6-2026',225.00,0.00,'wo_receipt',19,'WO Receipt WOR-01003 - WO-20027',1,'2026-06-27 13:15:41'),(18,4,'2026-06-27','6-2026',0.00,225.00,'wo_receipt',19,'WO Receipt WOR-01003 - WO-20027',1,'2026-06-27 13:15:41'),(19,5,'2026-06-27','6-2026',225.00,0.00,'po_receipt',8,'PO Receipt POR-01010 - PO PO-05004',1,'2026-06-27 13:25:55'),(20,7,'2026-06-27','6-2026',0.00,225.00,'po_receipt',8,'PO Receipt POR-01010 - PO PO-05004',1,'2026-06-27 13:25:55'),(21,14,'2026-06-27','6-2026',90.00,0.00,'shipment',10,'Shipment SH-01010 - SO 1',1,'2026-06-27 13:26:06'),(22,5,'2026-06-27','6-2026',0.00,90.00,'shipment',10,'Shipment SH-01010 - SO 1',1,'2026-06-27 13:26:06'),(23,14,'2026-06-27','6-2026',45.00,0.00,'shipment',11,'Shipment SH-01011 - SO 1',1,'2026-06-27 13:26:51'),(24,5,'2026-06-27','6-2026',0.00,45.00,'shipment',11,'Shipment SH-01011 - SO 1',1,'2026-06-27 13:26:51');
/*!40000 ALTER TABLE `gl_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_adjustments`
--

DROP TABLE IF EXISTS `inventory_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_adjustments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `adjustment_number` varchar(20) NOT NULL,
  `item_id` int NOT NULL,
  `location_id` int DEFAULT NULL,
  `adjustment_type` enum('increase','decrease','transfer') NOT NULL,
  `quantity` decimal(12,4) NOT NULL,
  `reason_code` varchar(50) DEFAULT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `cost` decimal(12,4) DEFAULT NULL,
  `notes` text,
  `adjusted_by` int DEFAULT NULL,
  `adjustment_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `posted` tinyint(1) DEFAULT '0',
  `posted_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `adjustment_number` (`adjustment_number`),
  KEY `item_id` (`item_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `inventory_adjustments_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `inventory_adjustments_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_adjustments`
--

LOCK TABLES `inventory_adjustments` WRITE;
/*!40000 ALTER TABLE `inventory_adjustments` DISABLE KEYS */;
INSERT INTO `inventory_adjustments` VALUES (1,'ADJ-01002',2,1,'increase',100.0000,NULL,NULL,NULL,NULL,NULL,1,'2026-06-25 23:41:37',0,NULL);
/*!40000 ALTER TABLE `inventory_adjustments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_balances`
--

DROP TABLE IF EXISTS `inventory_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_balances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `location_id` int NOT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `quantity_on_hand` decimal(12,4) DEFAULT '0.0000',
  `last_count_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_item_loc_lot` (`item_id`,`location_id`,`lot_number`),
  KEY `idx_item` (`item_id`),
  KEY `idx_location` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_balances`
--

LOCK TABLES `inventory_balances` WRITE;
/*!40000 ALTER TABLE `inventory_balances` DISABLE KEYS */;
INSERT INTO `inventory_balances` VALUES (1,2,1,NULL,211.0000,'2026-06-27 13:26:51'),(2,2,3,NULL,1.0000,NULL),(3,2,1,NULL,2.0000,'2026-06-27 13:26:51');
/*!40000 ALTER TABLE `inventory_balances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_transactions`
--

DROP TABLE IF EXISTS `inventory_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `transaction_type` enum('receipt','issue','adjustment','transfer','return','scrap','wo_receipt','wo_issue','po_receipt','shipment') NOT NULL,
  `quantity` decimal(12,4) NOT NULL,
  `reference_type` varchar(50) DEFAULT NULL COMMENT 'po_receipt, work_order, adjustment, transfer',
  `reference_id` int DEFAULT NULL,
  `reference_number` varchar(50) DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `from_location_id` int DEFAULT NULL,
  `to_location_id` int DEFAULT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `unit_cost` decimal(12,4) DEFAULT NULL,
  `total_cost` decimal(12,4) DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_item` (`item_id`),
  KEY `idx_ref` (`reference_type`,`reference_id`),
  KEY `idx_date` (`created_at`),
  KEY `idx_invt_item_date` (`item_id`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_transactions`
--

LOCK TABLES `inventory_transactions` WRITE;
/*!40000 ALTER TABLE `inventory_transactions` DISABLE KEYS */;
INSERT INTO `inventory_transactions` VALUES (1,2,'receipt',5.0000,'po_receipt',6,'POR-01008',4,NULL,NULL,'LOT-2026-001',125.0000,625.0000,'Received from PO PO-05002',1,'2026-06-26 02:57:15'),(2,2,'receipt',10.0000,'po_receipt',7,'POR-01009',7,NULL,NULL,'LOT-CF-2026-001',NULL,0.0000,'Received from PO PO-05004',1,'2026-06-26 03:11:25'),(3,2,'transfer',1.0000,'scan_transfer',NULL,NULL,NULL,1,3,NULL,NULL,NULL,NULL,1,'2026-06-26 22:43:12'),(5,3,'wo_issue',-5.2500,'work_order',19,'WO-20027',1,NULL,NULL,NULL,NULL,NULL,'Material backflush for WO receipt WOR-01003',1,'2026-06-27 13:15:41'),(6,2,'wo_receipt',5.0000,'work_order',19,'WO-20027',1,NULL,NULL,NULL,NULL,NULL,'WO Receipt WOR-01003',1,'2026-06-27 13:15:41'),(7,2,'receipt',5.0000,'po_receipt',8,'POR-01010',1,NULL,NULL,NULL,45.0000,225.0000,'Received from PO PO-05004',1,'2026-06-27 13:25:55'),(8,2,'shipment',-2.0000,'shipment',10,'SH-01010',1,NULL,NULL,NULL,0.0000,0.0000,'Shipped on SH-01010',1,'2026-06-27 13:26:06'),(9,2,'shipment',-1.0000,'shipment',11,'SH-01011',1,NULL,NULL,NULL,0.0000,0.0000,'Shipped on SH-01011',1,'2026-06-27 13:26:51');
/*!40000 ALTER TABLE `inventory_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_line_fabrication`
--

DROP TABLE IF EXISTS `invoice_line_fabrication`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_line_fabrication` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_line_id` int NOT NULL,
  `fabrication_charge_id` int NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '1.00',
  `rate` decimal(10,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(255) DEFAULT '',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fabrication_charge_id` (`fabrication_charge_id`),
  CONSTRAINT `invoice_line_fabrication_ibfk_1` FOREIGN KEY (`fabrication_charge_id`) REFERENCES `fabrication_charges` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_line_fabrication`
--

LOCK TABLES `invoice_line_fabrication` WRITE;
/*!40000 ALTER TABLE `invoice_line_fabrication` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoice_line_fabrication` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_customers`
--

DROP TABLE IF EXISTS `item_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `customer_item_number` varchar(50) DEFAULT NULL,
  `customer_description` varchar(255) DEFAULT NULL,
  `unit_price` decimal(12,4) DEFAULT NULL,
  `min_order_qty` decimal(12,4) DEFAULT '1.0000',
  `is_preferred` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `item_customers_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `item_customers_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_customers`
--

LOCK TABLES `item_customers` WRITE;
/*!40000 ALTER TABLE `item_customers` DISABLE KEYS */;
INSERT INTO `item_customers` VALUES (1,2,1,'CUST-TG-2436',NULL,95.0000,1.0000,0);
/*!40000 ALTER TABLE `item_customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_dimensions`
--

DROP TABLE IF EXISTS `item_dimensions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_dimensions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `dimension_type` varchar(50) NOT NULL,
  `dimension_value` varchar(100) DEFAULT NULL,
  `uom` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `item_dimensions_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_dimensions`
--

LOCK TABLES `item_dimensions` WRITE;
/*!40000 ALTER TABLE `item_dimensions` DISABLE KEYS */;
INSERT INTO `item_dimensions` VALUES (1,3,'Width','48','in'),(2,2,'Width','24 inches',NULL),(3,2,'Height','36 inches',NULL),(4,2,'Thickness','6mm',NULL),(5,2,'Weight','12.5 lbs',NULL);
/*!40000 ALTER TABLE `item_dimensions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_documents`
--

DROP TABLE IF EXISTS `item_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `document_type` enum('drawing','spec_sheet','msds','certificate','photo','other') NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `uploaded_by` int DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `item_documents_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_documents`
--

LOCK TABLES `item_documents` WRITE;
/*!40000 ALTER TABLE `item_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_gl_accounts`
--

DROP TABLE IF EXISTS `item_gl_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_gl_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `account_type` enum('inventory','cogs','revenue','purchase_variance','production_variance') NOT NULL,
  `gl_account_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_id` (`item_id`,`account_type`),
  KEY `gl_account_id` (`gl_account_id`),
  CONSTRAINT `item_gl_accounts_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `item_gl_accounts_ibfk_2` FOREIGN KEY (`gl_account_id`) REFERENCES `gl_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_gl_accounts`
--

LOCK TABLES `item_gl_accounts` WRITE;
/*!40000 ALTER TABLE `item_gl_accounts` DISABLE KEYS */;
INSERT INTO `item_gl_accounts` VALUES (1,3,'inventory',3),(2,2,'inventory',5),(3,2,'revenue',12),(4,2,'cogs',14);
/*!40000 ALTER TABLE `item_gl_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_pricing`
--

DROP TABLE IF EXISTS `item_pricing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_pricing` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `price_list` varchar(50) DEFAULT 'Standard',
  `min_qty` decimal(12,4) DEFAULT '0.0000',
  `max_qty` decimal(12,4) DEFAULT '999999.0000',
  `unit_price` decimal(12,4) NOT NULL,
  `tier_type` enum('stock_sheet','half_sheet','custom_cut','standard') DEFAULT 'standard',
  `price_per_sqft` decimal(10,4) DEFAULT '0.0000',
  `minimum_charge` decimal(10,2) DEFAULT '0.00',
  `effective_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `item_pricing_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_pricing`
--

LOCK TABLES `item_pricing` WRITE;
/*!40000 ALTER TABLE `item_pricing` DISABLE KEYS */;
INSERT INTO `item_pricing` VALUES (1,3,'Standard',1.0000,999999.0000,65.0000,'stock_sheet',2.2500,25.00,NULL,NULL),(2,2,'List',1.0000,999999.0000,89.0000,'standard',0.0000,0.00,'2026-01-01',NULL),(3,2,'Wholesale',10.0000,999999.0000,72.0000,'standard',0.0000,0.00,'2026-01-01',NULL),(4,2,'Contractor',25.0000,999999.0000,65.0000,'standard',0.0000,0.00,'2026-01-01',NULL),(5,2,'Standard',1.0000,999999.0000,85.0000,'stock_sheet',12.5000,50.00,NULL,NULL),(6,2,'Standard',1.0000,999999.0000,55.0000,'half_sheet',15.0000,35.00,NULL,NULL),(7,2,'Standard',1.0000,999999.0000,95.0000,'custom_cut',18.0000,65.00,NULL,NULL);
/*!40000 ALTER TABLE `item_pricing` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_types`
--

DROP TABLE IF EXISTS `item_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `costing_method` enum('standard','average','fifo','lifo') DEFAULT 'standard',
  `is_inventory` tinyint(1) DEFAULT '1',
  `exclude_from_mrp` tinyint(1) DEFAULT '0',
  `is_subcontract` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_types`
--

LOCK TABLES `item_types` WRITE;
/*!40000 ALTER TABLE `item_types` DISABLE KEYS */;
INSERT INTO `item_types` VALUES (1,'Raw Material','Raw materials purchased from vendors',1,'standard',1,0,0),(2,'Finished Good','Completed products ready for sale',1,'standard',1,0,0),(3,'Sub-Assembly','Intermediate assemblies used in production',1,'standard',1,0,0),(4,'Purchased Part','Parts bought and resold or used in assembly',1,'standard',1,0,0),(5,'Service','Non-inventory service items',1,'standard',1,0,0),(6,'Consumable','Items consumed in production but not tracked per unit',1,'standard',1,0,0),(7,'Raw Glass','Raw glass materials',1,'standard',1,0,0),(8,'Tempered Glass','Tempered glass products',1,'standard',1,0,0),(9,'Laminated Glass','Laminated glass products',1,'standard',1,0,0),(10,'Hardware','Hardware and accessories',1,'standard',1,0,0),(11,'Finished Good','Finished goods',1,'standard',1,0,0),(12,'Consumable','Consumable materials',1,'standard',1,0,0);
/*!40000 ALTER TABLE `item_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_vendors`
--

DROP TABLE IF EXISTS `item_vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_vendors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `vendor_id` int DEFAULT NULL,
  `vendor_item_number` varchar(50) DEFAULT NULL,
  `vendor_description` varchar(255) DEFAULT NULL,
  `unit_cost` decimal(12,4) DEFAULT NULL,
  `lead_time_days` int DEFAULT '0',
  `min_order_qty` decimal(12,4) DEFAULT '1.0000',
  `is_preferred` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `item_vendors_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_vendors`
--

LOCK TABLES `item_vendors` WRITE;
/*!40000 ALTER TABLE `item_vendors` DISABLE KEYS */;
INSERT INTO `item_vendors` VALUES (1,3,1,'GS-CLR-6-4896','Clear Glass 6mm 48x96',42.5000,5,10.0000,1),(2,2,1,'TG-CLR-24x36','Tempered Clear Glass 24x36',52.0000,7,5.0000,1),(3,8,1,'GGS-LAM-4872','Laminated Safety Glass 48x72 Clear',115.5000,7,10.0000,1);
/*!40000 ALTER TABLE `item_vendors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_number` varchar(50) NOT NULL,
  `description` varchar(255) NOT NULL,
  `additional_info` varchar(255) DEFAULT NULL,
  `item_type_id` int DEFAULT NULL,
  `uom` varchar(20) NOT NULL DEFAULT 'Each',
  `is_purchased` tinyint(1) DEFAULT '0',
  `is_manufactured` tinyint(1) DEFAULT '0',
  `is_sold` tinyint(1) DEFAULT '0',
  `is_material` tinyint(1) DEFAULT '0',
  `lot_control` tinyint(1) DEFAULT '0',
  `serial_control` tinyint(1) DEFAULT '0',
  `is_taxable` tinyint(1) DEFAULT '1',
  `is_backorderable` tinyint(1) DEFAULT '1',
  `exempt_from_commission` tinyint(1) DEFAULT '0',
  `has_warranty` tinyint(1) DEFAULT '0',
  `is_hazardous` tinyint(1) DEFAULT '0',
  `is_suspended` tinyint(1) DEFAULT '0',
  `include_in_forecast` tinyint(1) DEFAULT '1',
  `standard_cost` decimal(12,4) DEFAULT '0.0000',
  `weighted_avg_cost` decimal(12,4) DEFAULT '0.0000',
  `last_cost` decimal(12,4) DEFAULT '0.0000',
  `qty_on_hand` decimal(12,4) DEFAULT '0.0000',
  `receipt_location_id` int DEFAULT NULL,
  `shipping_location_id` int DEFAULT NULL,
  `bin` varchar(20) DEFAULT NULL,
  `cycle_code` varchar(10) DEFAULT NULL,
  `item_group` varchar(50) DEFAULT NULL,
  `item_master_group` varchar(50) DEFAULT NULL,
  `min_order_qty` decimal(12,4) DEFAULT '1.0000',
  `minimum_qty` decimal(12,4) DEFAULT '1.0000',
  `lead_time_days` int DEFAULT '0',
  `production_days` int DEFAULT '0',
  `production_qty` decimal(12,4) DEFAULT '0.0000',
  `batch_size` decimal(12,4) DEFAULT '1.0000',
  `revision` varchar(20) DEFAULT NULL,
  `drawing_number` varchar(50) DEFAULT NULL,
  `unit_weight` decimal(10,4) DEFAULT '0.0000',
  `glass_type` enum('clear','low_e','tinted','frosted','mirror','laminated') DEFAULT NULL,
  `glass_thickness` varchar(10) DEFAULT NULL,
  `tempering_status` enum('annealed','tempered','heat_strengthened','laminated') DEFAULT NULL,
  `edge_type` enum('flat_polish','pencil_polish','beveled','seamed','raw') DEFAULT NULL,
  `pricing_method` enum('per_unit','per_sqft','per_linear_ft') DEFAULT 'per_unit',
  `custom_field_1` varchar(100) DEFAULT NULL,
  `custom_field_2` varchar(100) DEFAULT NULL,
  `custom_field_3` varchar(100) DEFAULT NULL,
  `custom_field_4` varchar(100) DEFAULT NULL,
  `custom_field_5` varchar(100) DEFAULT NULL,
  `notes` text,
  `internal_notes` text,
  `entered_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `item_type` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `manufacturer_name` varchar(100) DEFAULT NULL,
  `manufacturer_part_number` varchar(100) DEFAULT NULL,
  `country_of_origin` varchar(50) DEFAULT NULL,
  `hs_code` varchar(20) DEFAULT NULL,
  `certification` varchar(200) DEFAULT NULL,
  `tech_specifications` text,
  `application_notes` text,
  `commission_percent` decimal(5,2) DEFAULT '0.00',
  `commission_type` varchar(20) DEFAULT 'standard',
  `reorder_point` decimal(12,4) DEFAULT '0.0000',
  `reorder_qty` decimal(12,4) DEFAULT '0.0000',
  `base_price` decimal(12,4) DEFAULT '0.0000',
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_number` (`item_number`),
  KEY `item_type_id` (`item_type_id`),
  KEY `receipt_location_id` (`receipt_location_id`),
  KEY `shipping_location_id` (`shipping_location_id`),
  CONSTRAINT `items_ibfk_1` FOREIGN KEY (`item_type_id`) REFERENCES `item_types` (`id`),
  CONSTRAINT `items_ibfk_2` FOREIGN KEY (`receipt_location_id`) REFERENCES `locations` (`id`),
  CONSTRAINT `items_ibfk_3` FOREIGN KEY (`shipping_location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `items`
--

LOCK TABLES `items` WRITE;
/*!40000 ALTER TABLE `items` DISABLE KEYS */;
INSERT INTO `items` VALUES (2,'TG-001','Tempered Glass Panel 24x36',NULL,8,'Each',1,1,1,0,0,0,1,1,0,0,0,0,1,45.0000,0.0000,0.0000,217.0000,1,NULL,NULL,NULL,NULL,NULL,1.0000,1.0000,0,0,0.0000,1.0000,NULL,NULL,0.0000,'clear','3/8',NULL,NULL,'per_unit',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-06-25 23:37:19','2026-06-27 13:26:51','Tempered Glass',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,'standard',0.0000,0.0000,89.0000),(3,'RG-001','Raw Clear Glass Sheet 48x96',NULL,7,'Each',1,0,0,1,1,0,1,1,0,0,0,0,1,45.0000,0.0000,0.0000,0.0000,NULL,NULL,NULL,NULL,NULL,NULL,1.0000,10.0000,7,0,0.0000,1.0000,NULL,NULL,0.0000,'clear','6mm',NULL,NULL,'per_sqft',NULL,NULL,NULL,NULL,NULL,'Standard raw glass sheet for cutting',NULL,1,'2026-06-26 10:50:42','2026-06-27 13:23:27','Raw Glass',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,'standard',0.0000,0.0000,55.0000),(8,'LG-001','Laminated Safety Glass Panel 48x72',NULL,9,'Each',1,1,1,1,1,0,1,1,1,0,0,0,1,125.0000,NULL,NULL,NULL,7,NULL,NULL,NULL,NULL,NULL,10.0000,NULL,14,3,NULL,NULL,NULL,NULL,NULL,'clear','6mm','laminated','flat_polish','per_sqft',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-06-26 11:31:34','2026-06-27 13:23:27','Laminated Glass',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,'standard',0.0000,0.0000,245.0000),(9,'PVB-076','PVB Interlayer Film 0.76mm',NULL,6,'SqFt',1,0,0,1,0,0,1,1,0,0,0,0,1,2.5000,0.0000,0.0000,5000.0000,NULL,NULL,NULL,NULL,NULL,NULL,1.0000,1.0000,0,0,0.0000,1.0000,NULL,NULL,0.0000,NULL,NULL,NULL,NULL,'per_unit',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-27 12:34:37','2026-06-27 13:23:27',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,'standard',0.0000,0.0000,5.5000);
/*!40000 ALTER TABLE `items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_lines`
--

DROP TABLE IF EXISTS `journal_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `voucher_id` int NOT NULL,
  `line_number` int NOT NULL,
  `gl_account_id` int NOT NULL,
  `debit_amount` decimal(14,2) DEFAULT '0.00',
  `credit_amount` decimal(14,2) DEFAULT '0.00',
  `description` varchar(255) DEFAULT NULL,
  `reference` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `voucher_id` (`voucher_id`),
  KEY `gl_account_id` (`gl_account_id`),
  CONSTRAINT `journal_lines_ibfk_1` FOREIGN KEY (`voucher_id`) REFERENCES `journal_vouchers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `journal_lines_ibfk_2` FOREIGN KEY (`gl_account_id`) REFERENCES `gl_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_lines`
--

LOCK TABLES `journal_lines` WRITE;
/*!40000 ALTER TABLE `journal_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `journal_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_voucher_lines`
--

DROP TABLE IF EXISTS `journal_voucher_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal_voucher_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `journal_voucher_id` int NOT NULL,
  `line_number` int NOT NULL,
  `gl_account_id` int NOT NULL,
  `debit` decimal(14,2) DEFAULT '0.00',
  `credit` decimal(14,2) DEFAULT '0.00',
  `memo` varchar(255) DEFAULT NULL,
  `reference` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `journal_voucher_id` (`journal_voucher_id`),
  KEY `gl_account_id` (`gl_account_id`),
  CONSTRAINT `journal_voucher_lines_ibfk_1` FOREIGN KEY (`journal_voucher_id`) REFERENCES `journal_vouchers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `journal_voucher_lines_ibfk_2` FOREIGN KEY (`gl_account_id`) REFERENCES `gl_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_voucher_lines`
--

LOCK TABLES `journal_voucher_lines` WRITE;
/*!40000 ALTER TABLE `journal_voucher_lines` DISABLE KEYS */;
INSERT INTO `journal_voucher_lines` VALUES (1,2,1,1,10000.00,0.00,'Cash opening balance',NULL),(2,2,2,2,0.00,10000.00,'Equity opening balance',NULL),(3,3,1,1,500.00,0.00,'Depreciation expense',NULL),(4,3,2,2,0.00,500.00,'Accumulated depreciation',NULL);
/*!40000 ALTER TABLE `journal_voucher_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_vouchers`
--

DROP TABLE IF EXISTS `journal_vouchers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal_vouchers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `voucher_number` varchar(20) NOT NULL,
  `voucher_date` date NOT NULL,
  `period_id` int DEFAULT NULL,
  `period` varchar(20) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `memo` varchar(255) DEFAULT NULL,
  `reference` varchar(50) DEFAULT NULL,
  `source` varchar(50) DEFAULT NULL,
  `source_reference` varchar(50) DEFAULT NULL,
  `total_debit` decimal(14,2) DEFAULT '0.00',
  `total_credit` decimal(14,2) DEFAULT '0.00',
  `total_debit_amt` decimal(14,2) DEFAULT '0.00',
  `total_credit_amt` decimal(14,2) DEFAULT '0.00',
  `status` enum('draft','posted','reversed') DEFAULT 'draft',
  `posted_date` datetime DEFAULT NULL,
  `posted_by` int DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `voucher_number` (`voucher_number`),
  KEY `period_id` (`period_id`),
  CONSTRAINT `journal_vouchers_ibfk_1` FOREIGN KEY (`period_id`) REFERENCES `accounting_periods` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_vouchers`
--

LOCK TABLES `journal_vouchers` WRITE;
/*!40000 ALTER TABLE `journal_vouchers` DISABLE KEYS */;
INSERT INTO `journal_vouchers` VALUES (1,'JV-01001','2026-06-25',NULL,NULL,NULL,NULL,NULL,NULL,NULL,10000.00,10000.00,0.00,0.00,'draft',NULL,NULL,NULL,1,'2026-06-25 23:38:45'),(2,'JV-01002','2026-06-25',NULL,NULL,NULL,'Opening balance entry',NULL,NULL,NULL,10000.00,10000.00,0.00,0.00,'draft',NULL,NULL,NULL,1,'2026-06-25 23:39:53'),(3,'JV-01003','2026-06-26',NULL,NULL,NULL,NULL,NULL,NULL,NULL,500.00,500.00,0.00,0.00,'draft',NULL,NULL,NULL,1,'2026-06-26 00:18:59');
/*!40000 ALTER TABLE `journal_vouchers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `label_configurations`
--

DROP TABLE IF EXISTS `label_configurations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `label_configurations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `label_type` enum('product','shipping','receipt','barcode','rack','station') NOT NULL,
  `name` varchar(100) NOT NULL,
  `width_inches` decimal(5,2) NOT NULL,
  `height_inches` decimal(5,2) NOT NULL,
  `barcode_format` enum('code128','code39','qr','ean13','upc') DEFAULT 'code128',
  `template_html` text,
  `fields_json` json DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `label_configurations`
--

LOCK TABLES `label_configurations` WRITE;
/*!40000 ALTER TABLE `label_configurations` DISABLE KEYS */;
INSERT INTO `label_configurations` VALUES (1,'product','Glass Panel Label (4x3)',4.00,3.00,'code128',NULL,'[\"item_number\", \"description\", \"glass_type\", \"thickness\", \"width\", \"height\", \"lot_number\", \"location\", \"po_number\", \"date_received\"]',1,1),(2,'receipt','Receipt Label (3x2)',3.00,2.00,'code128',NULL,'[\"receipt_number\", \"po_number\", \"vendor\", \"item_count\", \"date_received\"]',0,1),(3,'rack','Rack Location Label (2x1)',2.00,1.00,'code128',NULL,'[\"location_name\", \"barcode\", \"warehouse\"]',0,1);
/*!40000 ALTER TABLE `label_configurations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_autoclave_batch_items`
--

DROP TABLE IF EXISTS `lami_autoclave_batch_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_autoclave_batch_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `work_order_id` int NOT NULL,
  `layup_record_id` int DEFAULT NULL,
  `position_in_load` varchar(20) DEFAULT NULL,
  `width_mm` decimal(10,2) NOT NULL,
  `height_mm` decimal(10,2) NOT NULL,
  `total_thickness_mm` decimal(6,2) NOT NULL,
  `sqm` decimal(10,4) NOT NULL,
  `status` enum('loaded','completed','failed','rejected') DEFAULT 'loaded',
  `defect_type` varchar(100) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_autoclave_batch_items`
--

LOCK TABLES `lami_autoclave_batch_items` WRITE;
/*!40000 ALTER TABLE `lami_autoclave_batch_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_autoclave_batch_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_autoclave_batches`
--

DROP TABLE IF EXISTS `lami_autoclave_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_autoclave_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_number` varchar(50) NOT NULL,
  `autoclave_id` int DEFAULT '1',
  `recipe_id` int NOT NULL,
  `status` enum('loading','loaded','in_cycle','cooling','completed','failed') DEFAULT 'loading',
  `total_pieces` int DEFAULT '0',
  `total_sqm` decimal(10,2) DEFAULT '0.00',
  `max_capacity_sqm` decimal(10,2) DEFAULT '50.00',
  `interlayer_type` varchar(50) NOT NULL,
  `cycle_start` datetime DEFAULT NULL,
  `cycle_end` datetime DEFAULT NULL,
  `actual_temp_max` decimal(5,1) DEFAULT NULL,
  `actual_pressure_max` decimal(5,2) DEFAULT NULL,
  `operator_id` int DEFAULT NULL,
  `qc_passed` tinyint(1) DEFAULT NULL,
  `qc_inspector_id` int DEFAULT NULL,
  `qc_date` datetime DEFAULT NULL,
  `qc_notes` text,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_number` (`batch_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_autoclave_batches`
--

LOCK TABLES `lami_autoclave_batches` WRITE;
/*!40000 ALTER TABLE `lami_autoclave_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_autoclave_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_autoclave_recipes`
--

DROP TABLE IF EXISTS `lami_autoclave_recipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_autoclave_recipes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recipe_name` varchar(100) NOT NULL,
  `recipe_code` varchar(20) NOT NULL,
  `interlayer_type` enum('PVB','SGP','EVA','TPU','Acoustic_PVB') NOT NULL,
  `min_thickness_mm` decimal(6,2) DEFAULT NULL,
  `max_thickness_mm` decimal(6,2) DEFAULT NULL,
  `ramp_rate_c_per_min` decimal(5,2) DEFAULT '1.50',
  `target_temperature_c` decimal(5,1) NOT NULL,
  `soak_time_min` int NOT NULL,
  `max_pressure_bar` decimal(5,2) NOT NULL,
  `cooling_rate_c_per_min` decimal(5,2) DEFAULT '2.00',
  `total_cycle_hours` decimal(5,2) NOT NULL,
  `vacuum_required` tinyint(1) DEFAULT '0',
  `notes` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `recipe_code` (`recipe_code`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_autoclave_recipes`
--

LOCK TABLES `lami_autoclave_recipes` WRITE;
/*!40000 ALTER TABLE `lami_autoclave_recipes` DISABLE KEYS */;
INSERT INTO `lami_autoclave_recipes` VALUES (1,'PVB Standard (up to 12mm)','PVB-STD','PVB',0.00,12.00,1.50,135.0,60,12.00,2.00,3.50,0,'Standard PVB cycle for panels up to 12mm total thickness',1,'2026-06-27 11:45:04'),(2,'PVB Heavy (12-25mm)','PVB-HVY','PVB',12.00,25.00,1.00,140.0,90,12.50,1.50,5.00,0,'Extended cycle for thick laminated panels',1,'2026-06-27 11:45:04'),(3,'PVB Jumbo (25mm+)','PVB-JMB','PVB',25.00,100.00,0.80,140.0,120,13.00,1.00,6.50,0,'Long cycle for very thick or multi-ply laminates',1,'2026-06-27 11:45:04'),(4,'SGP Standard','SGP-STD','SGP',0.00,20.00,1.50,135.0,60,14.00,2.00,4.00,0,'SentryGlas Plus standard cycle - higher pressure required',1,'2026-06-27 11:45:04'),(5,'SGP Structural (20mm+)','SGP-STR','SGP',20.00,100.00,1.00,140.0,90,14.50,1.50,5.50,0,'SGP structural glass cycle for balustrades/floors',1,'2026-06-27 11:45:04'),(6,'EVA Standard','EVA-STD','EVA',0.00,20.00,2.00,110.0,45,0.00,2.50,2.50,1,'EVA vacuum bag process - lower temperature, no pressure',1,'2026-06-27 11:45:04'),(7,'TPU Standard','TPU-STD','TPU',0.00,15.00,1.50,130.0,60,12.00,2.00,3.50,0,'TPU interlayer standard cycle',1,'2026-06-27 11:45:04'),(8,'Acoustic PVB','APVB-STD','Acoustic_PVB',0.00,20.00,1.50,135.0,75,12.00,2.00,4.00,0,'Acoustic PVB requires slightly longer soak time',1,'2026-06-27 11:45:04');
/*!40000 ALTER TABLE `lami_autoclave_recipes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_bom_lines`
--

DROP TABLE IF EXISTS `lami_bom_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_bom_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `sequence` int DEFAULT '10',
  `component_type` enum('glass_lite','interlayer','hardware','consumable','other') NOT NULL,
  `component_item_id` int DEFAULT NULL,
  `quantity_per` decimal(8,2) DEFAULT '1.00',
  `width_mm` decimal(8,2) DEFAULT NULL,
  `height_mm` decimal(8,2) DEFAULT NULL,
  `thickness_mm` decimal(6,2) DEFAULT NULL,
  `overhang_mm` decimal(6,2) DEFAULT '0.00',
  `uom` varchar(20) DEFAULT 'EA',
  `consumed_at_operation` int DEFAULT NULL,
  `notes` text,
  `child_wo_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_bom_lines`
--

LOCK TABLES `lami_bom_lines` WRITE;
/*!40000 ALTER TABLE `lami_bom_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_bom_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_cleanroom_sessions`
--

DROP TABLE IF EXISTS `lami_cleanroom_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_cleanroom_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_number` varchar(50) NOT NULL,
  `operator_id` int DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `temperature_c` decimal(5,1) DEFAULT NULL,
  `humidity_percent` decimal(5,1) DEFAULT NULL,
  `status` enum('active','completed','aborted') DEFAULT 'active',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_number` (`session_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_cleanroom_sessions`
--

LOCK TABLES `lami_cleanroom_sessions` WRITE;
/*!40000 ALTER TABLE `lami_cleanroom_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_cleanroom_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_interlayer_cut_lines`
--

DROP TABLE IF EXISTS `lami_interlayer_cut_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_interlayer_cut_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cut_plan_id` int NOT NULL,
  `sequence` int NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `width_mm` decimal(10,2) NOT NULL,
  `length_mm` decimal(10,2) NOT NULL,
  `quantity` int DEFAULT '1',
  `material_type` varchar(50) NOT NULL,
  `thickness_mm` decimal(6,2) NOT NULL,
  `overhang_mm` decimal(6,2) DEFAULT '5.00',
  `status` enum('pending','cut','verified','rejected') DEFAULT 'pending',
  `cut_by` int DEFAULT NULL,
  `cut_at` datetime DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_interlayer_cut_lines`
--

LOCK TABLES `lami_interlayer_cut_lines` WRITE;
/*!40000 ALTER TABLE `lami_interlayer_cut_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_interlayer_cut_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_interlayer_cut_plan_items`
--

DROP TABLE IF EXISTS `lami_interlayer_cut_plan_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_interlayer_cut_plan_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan_id` int NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `sequence` int DEFAULT NULL,
  `cut_width_mm` decimal(8,2) NOT NULL,
  `cut_length_mm` decimal(8,2) NOT NULL,
  `position_on_roll_m` decimal(8,2) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_interlayer_cut_plan_items`
--

LOCK TABLES `lami_interlayer_cut_plan_items` WRITE;
/*!40000 ALTER TABLE `lami_interlayer_cut_plan_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_interlayer_cut_plan_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_interlayer_cut_plans`
--

DROP TABLE IF EXISTS `lami_interlayer_cut_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_interlayer_cut_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan_number` varchar(50) NOT NULL,
  `roll_id` int NOT NULL,
  `status` enum('planned','in_progress','completed','cancelled') DEFAULT 'planned',
  `total_pieces` int DEFAULT '0',
  `total_length_used_m` decimal(10,2) DEFAULT '0.00',
  `waste_percent` decimal(5,2) DEFAULT '0.00',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plan_number` (`plan_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_interlayer_cut_plans`
--

LOCK TABLES `lami_interlayer_cut_plans` WRITE;
/*!40000 ALTER TABLE `lami_interlayer_cut_plans` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_interlayer_cut_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_interlayer_rolls`
--

DROP TABLE IF EXISTS `lami_interlayer_rolls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_interlayer_rolls` (
  `id` int NOT NULL AUTO_INCREMENT,
  `roll_number` varchar(50) NOT NULL,
  `item_id` int DEFAULT NULL,
  `material_type` enum('PVB','SGP','EVA','TPU','Acoustic_PVB','Colored_PVB','SentryGlas') NOT NULL,
  `thickness_mm` decimal(6,2) NOT NULL,
  `width_mm` decimal(10,2) NOT NULL,
  `original_length_m` decimal(10,2) NOT NULL,
  `current_length_m` decimal(10,2) NOT NULL,
  `lot_number` varchar(100) NOT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `color` varchar(50) DEFAULT 'Clear',
  `location_id` int DEFAULT NULL,
  `rack_position` varchar(50) DEFAULT NULL,
  `received_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `opened_date` date DEFAULT NULL,
  `status` enum('sealed','in_use','exhausted','expired','quarantine') DEFAULT 'sealed',
  `humidity_exposure_hours` decimal(8,2) DEFAULT '0.00',
  `max_humidity_exposure` decimal(8,2) DEFAULT '48.00',
  `cost_per_sqm` decimal(10,4) DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `po_number` varchar(50) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roll_number` (`roll_number`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_interlayer_rolls`
--

LOCK TABLES `lami_interlayer_rolls` WRITE;
/*!40000 ALTER TABLE `lami_interlayer_rolls` DISABLE KEYS */;
INSERT INTO `lami_interlayer_rolls` VALUES (1,'ROLL-PVB-001',NULL,'PVB',0.76,1830.00,300.00,285.50,'LOT-2026-A001','Eastman','Clear',NULL,NULL,'2026-05-15','2027-05-15',NULL,'in_use',0.00,48.00,8.5000,NULL,NULL,NULL,'2026-06-27 11:45:04','2026-06-27 11:45:04'),(2,'ROLL-PVB-002',NULL,'PVB',0.76,2440.00,300.00,300.00,'LOT-2026-A002','Eastman','Clear',NULL,NULL,'2026-06-01','2027-06-01',NULL,'sealed',0.00,48.00,8.5000,NULL,NULL,NULL,'2026-06-27 11:45:04','2026-06-27 11:45:04'),(3,'ROLL-PVB-003',NULL,'PVB',1.52,1830.00,200.00,142.30,'LOT-2026-B001','Eastman','Clear',NULL,NULL,'2026-04-20','2027-04-20',NULL,'in_use',0.00,48.00,16.0000,NULL,NULL,NULL,'2026-06-27 11:45:04','2026-06-27 11:45:04'),(4,'ROLL-SGP-001',NULL,'SGP',1.52,1530.00,150.00,150.00,'LOT-2026-SGP01','Trosifol','Clear',NULL,NULL,'2026-06-10','2027-12-10',NULL,'sealed',0.00,48.00,45.0000,NULL,NULL,NULL,'2026-06-27 11:45:04','2026-06-27 11:45:04'),(5,'ROLL-SGP-002',NULL,'SGP',2.28,1830.00,100.00,78.20,'LOT-2026-SGP02','Trosifol','Clear',NULL,NULL,'2026-03-15','2027-09-15',NULL,'in_use',0.00,48.00,62.0000,NULL,NULL,NULL,'2026-06-27 11:45:04','2026-06-27 11:45:04'),(6,'ROLL-EVA-001',NULL,'EVA',0.76,2440.00,250.00,250.00,'LOT-2026-EVA01','Bridgestone','Clear',NULL,NULL,'2026-06-20','2028-06-20',NULL,'sealed',0.00,48.00,6.5000,NULL,NULL,NULL,'2026-06-27 11:45:04','2026-06-27 11:45:04'),(7,'ROLL-APVB-001',NULL,'Acoustic_PVB',0.76,1830.00,200.00,165.00,'LOT-2026-AC01','Eastman','Clear',NULL,NULL,'2026-05-01','2027-05-01',NULL,'in_use',0.00,48.00,12.0000,NULL,NULL,NULL,'2026-06-27 11:45:04','2026-06-27 11:45:04'),(8,'ROLL-TPU-001',NULL,'TPU',0.76,1530.00,150.00,150.00,'LOT-2026-TPU01','Huntsman','Clear',NULL,NULL,'2026-06-15','2028-06-15',NULL,'sealed',0.00,48.00,22.0000,NULL,NULL,NULL,'2026-06-27 11:45:04','2026-06-27 11:45:04');
/*!40000 ALTER TABLE `lami_interlayer_rolls` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_layup_records`
--

DROP TABLE IF EXISTS `lami_layup_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_layup_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `cleanroom_session_id` int DEFAULT NULL,
  `roll_id` int NOT NULL,
  `roll_lot_number` varchar(100) NOT NULL,
  `interlayer_width_mm` decimal(10,2) NOT NULL,
  `interlayer_length_mm` decimal(10,2) NOT NULL,
  `glass_lite_1_wo_id` int DEFAULT NULL,
  `glass_lite_2_wo_id` int DEFAULT NULL,
  `glass_lite_3_wo_id` int DEFAULT NULL,
  `layup_sequence` text,
  `operator_id` int DEFAULT NULL,
  `layup_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `temperature_c` decimal(5,1) DEFAULT NULL,
  `humidity_percent` decimal(5,1) DEFAULT NULL,
  `pre_press_method` enum('nip_roller','vacuum_bag','none') DEFAULT 'nip_roller',
  `pre_press_time_min` int DEFAULT NULL,
  `status` enum('layup_complete','pre_pressed','ready_for_autoclave','in_autoclave','completed','rejected') DEFAULT 'layup_complete',
  `qc_passed` tinyint(1) DEFAULT NULL,
  `qc_notes` text,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_layup_records`
--

LOCK TABLES `lami_layup_records` WRITE;
/*!40000 ALTER TABLE `lami_layup_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_layup_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `location_groups`
--

DROP TABLE IF EXISTS `location_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `location_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(50) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `location_groups`
--

LOCK TABLES `location_groups` WRITE;
/*!40000 ALTER TABLE `location_groups` DISABLE KEYS */;
INSERT INTO `location_groups` VALUES (1,'RAW','Raw Materials',1,'2026-06-26 03:52:53'),(2,'WIP','Work in Progress',1,'2026-06-26 03:52:53'),(3,'FG','Finished Goods',1,'2026-06-26 03:52:53'),(4,'SHIP','Shipping',1,'2026-06-26 03:52:53'),(5,'QC','Quality Hold',1,'2026-06-26 03:52:53'),(6,'RAW','Raw Materials',1,'2026-06-26 03:53:22'),(7,'WIP','Work in Progress',1,'2026-06-26 03:53:22'),(8,'FG','Finished Goods',1,'2026-06-26 03:53:22'),(9,'SHIP','Shipping',1,'2026-06-26 03:53:22'),(10,'QC','Quality Hold',1,'2026-06-26 03:53:22');
/*!40000 ALTER TABLE `location_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `location_group` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `parent_id` int DEFAULT NULL,
  `location_type` enum('warehouse','zone','rack','bin','floor') DEFAULT 'warehouse',
  `barcode` varchar(50) DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `current_items` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `locations`
--

LOCK TABLES `locations` WRITE;
/*!40000 ALTER TABLE `locations` DISABLE KEYS */;
INSERT INTO `locations` VALUES (1,'MAIN','Main Warehouse',NULL,NULL,1,NULL,'warehouse',NULL,NULL,5),(2,'WAREHOUSE','Secondary Warehouse',NULL,NULL,1,NULL,'warehouse',NULL,NULL,0),(3,'SHOP','Shop Floor',NULL,NULL,1,NULL,'warehouse',NULL,NULL,0),(4,'RGA','Raw Glass - Rack A',NULL,NULL,1,1,'rack','LOC-RGA',50,5),(5,'RGB','Raw Glass - Rack B',NULL,NULL,1,1,'rack','LOC-RGB',50,0),(6,'TMP','Tempered Stock',NULL,NULL,1,1,'rack','LOC-TMP',100,0),(7,'LAM','Laminated Stock',NULL,NULL,1,1,'rack','LOC-LAM',80,10),(8,'IGU','IGU Stock',NULL,NULL,1,1,'rack','LOC-IGU',60,0),(9,'FGS','Finished Goods - Shipping',NULL,NULL,1,1,'zone','LOC-FGS',200,0),(10,'HWR','Hardware & Supplies',NULL,NULL,1,1,'rack','LOC-HWR',40,0),(11,'ILR','Interlayer Storage',NULL,NULL,1,1,'rack','LOC-ILR',30,0);
/*!40000 ALTER TABLE `locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lots`
--

DROP TABLE IF EXISTS `lots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lot_number` varchar(50) NOT NULL,
  `item_id` int NOT NULL,
  `quantity` decimal(12,4) DEFAULT '0.0000',
  `location_id` int DEFAULT NULL,
  `expiration_date` date DEFAULT NULL,
  `supplier_lot_number` varchar(50) DEFAULT NULL,
  `status` enum('available','on_hold','quarantine','expired') DEFAULT 'available',
  `received_date` date DEFAULT NULL,
  `notes` text,
  `vendor_id` int DEFAULT NULL,
  `po_number` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `lots_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `lots_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lots`
--

LOCK TABLES `lots` WRITE;
/*!40000 ALTER TABLE `lots` DISABLE KEYS */;
INSERT INTO `lots` VALUES (1,'LOT-2026-001',2,5.0000,4,NULL,NULL,'available','2026-06-26',NULL,1,'PO-05002'),(2,'LOT-CF-2026-001',2,10.0000,7,NULL,NULL,'available','2026-06-26',NULL,1,'PO-05004');
/*!40000 ALTER TABLE `lots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_log`
--

DROP TABLE IF EXISTS `notification_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `notification_type` varchar(50) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `item_count` int DEFAULT '0',
  `details` json DEFAULT NULL,
  `email_sent` tinyint(1) DEFAULT '0',
  `sent_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_type_date` (`notification_type`,`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_log`
--

LOCK TABLES `notification_log` WRITE;
/*!40000 ALTER TABLE `notification_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_preferences`
--

DROP TABLE IF EXISTS `notification_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_preferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `email_enabled` tinyint(1) DEFAULT '1',
  `in_app_enabled` tinyint(1) DEFAULT '1',
  `digest_frequency` enum('immediate','daily','weekly','none') DEFAULT 'immediate',
  `muted_categories` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `notification_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_preferences`
--

LOCK TABLES `notification_preferences` WRITE;
/*!40000 ALTER TABLE `notification_preferences` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_rules`
--

DROP TABLE IF EXISTS `notification_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(100) NOT NULL,
  `rule_type` enum('inventory_low','invoice_overdue','wo_deadline','credit_limit','payment_received','order_received','shipment_delivered','maintenance_due','custom') NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `conditions` json DEFAULT NULL,
  `notify_roles` json DEFAULT NULL,
  `notify_users` json DEFAULT NULL,
  `notify_method` enum('in_app','email','both') DEFAULT 'in_app',
  `frequency` enum('immediate','daily_digest','weekly_digest') DEFAULT 'immediate',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_rules`
--

LOCK TABLES `notification_rules` WRITE;
/*!40000 ALTER TABLE `notification_rules` DISABLE KEYS */;
INSERT INTO `notification_rules` VALUES (1,'Low Stock Alert','inventory_low',1,'{\"threshold_type\": \"reorder_point\"}','[\"admin\", \"inventory_manager\"]',NULL,'both','immediate','2026-06-27 10:08:17','2026-06-27 10:08:17'),(2,'Invoice Overdue 30 Days','invoice_overdue',1,'{\"days_overdue\": 30}','[\"admin\", \"accounting\"]',NULL,'both','immediate','2026-06-27 10:08:17','2026-06-27 10:08:17'),(3,'WO Deadline Tomorrow','wo_deadline',1,'{\"days_before\": 1}','[\"admin\", \"production_manager\"]',NULL,'in_app','immediate','2026-06-27 10:08:17','2026-06-27 10:08:17'),(4,'Credit Limit Exceeded','credit_limit',1,'{\"threshold_percent\": 90}','[\"admin\", \"sales_manager\"]',NULL,'both','immediate','2026-06-27 10:08:17','2026-06-27 10:08:17'),(5,'Payment Received','payment_received',1,'{}','[\"admin\", \"accounting\"]',NULL,'in_app','immediate','2026-06-27 10:08:17','2026-06-27 10:08:17'),(6,'New Order from Smart Glazier','order_received',1,'{\"source\": \"smart_glazier\"}','[\"admin\", \"sales\"]',NULL,'both','immediate','2026-06-27 10:08:17','2026-06-27 10:08:17'),(7,'Shipment Delivered','shipment_delivered',1,'{}','[\"admin\", \"shipping\"]',NULL,'in_app','immediate','2026-06-27 10:08:17','2026-06-27 10:08:17'),(8,'Rack Maintenance Due','maintenance_due',1,'{\"days_before\": 7}','[\"admin\", \"shipping\"]',NULL,'in_app','immediate','2026-06-27 10:08:17','2026-06-27 10:08:17'),(9,'Low Stock Alert','',1,'{\"threshold\": \"reorder_point\"}','[\"admin\", \"inventory\"]',NULL,'in_app','','2026-06-27 10:20:34','2026-06-27 10:20:34'),(10,'Overdue Invoice','',1,'{\"days_overdue\": 30}','[\"admin\", \"accounting\"]',NULL,'in_app','','2026-06-27 10:20:34','2026-06-27 10:20:34'),(11,'WO Due Soon','wo_deadline',1,'{\"days_ahead\": 3}','[\"admin\", \"manufacturing\"]',NULL,'in_app','','2026-06-27 10:20:34','2026-06-27 10:20:34'),(12,'PO Past Due','',1,'{\"days_overdue\": 7}','[\"admin\", \"purchasing\"]',NULL,'in_app','','2026-06-27 10:20:34','2026-06-27 10:20:34'),(13,'Machine Maintenance','maintenance_due',1,'{\"interval_days\": 30}','[\"admin\", \"manufacturing\"]',NULL,'in_app','','2026-06-27 10:20:34','2026-06-27 10:20:34'),(14,'Credit Limit Warning','credit_limit',1,'{\"threshold_pct\": 90}','[\"admin\", \"sales\"]',NULL,'in_app','','2026-06-27 10:20:34','2026-06-27 10:20:34');
/*!40000 ALTER TABLE `notification_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `rule_id` int DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','warning','error','success') DEFAULT 'info',
  `category` enum('inventory','sales','purchasing','manufacturing','accounting','system','dispatch') NOT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` datetime DEFAULT NULL,
  `is_dismissed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `rule_id` (`rule_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`rule_id`) REFERENCES `notification_rules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_documents`
--

DROP TABLE IF EXISTS `order_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sales_order_id` int NOT NULL,
  `document_type` enum('customer_po','drawing','delivery_note','packing_list','other') DEFAULT 'other',
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `notes` text,
  `uploaded_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sales_order_id` (`sales_order_id`),
  CONSTRAINT `order_documents_ibfk_1` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_documents`
--

LOCK TABLES `order_documents` WRITE;
/*!40000 ALTER TABLE `order_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_applications`
--

DROP TABLE IF EXISTS `payment_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_id` int NOT NULL,
  `invoice_id` int DEFAULT NULL,
  `amount_applied` decimal(12,2) NOT NULL,
  `ar_invoice_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `payment_id` (`payment_id`),
  KEY `invoice_id` (`invoice_id`),
  CONSTRAINT `payment_applications_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `customer_payments` (`id`),
  CONSTRAINT `payment_applications_ibfk_2` FOREIGN KEY (`invoice_id`) REFERENCES `ar_invoices` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_applications`
--

LOCK TABLES `payment_applications` WRITE;
/*!40000 ALTER TABLE `payment_applications` DISABLE KEYS */;
INSERT INTO `payment_applications` VALUES (1,3,NULL,1250.00,3),(2,4,NULL,1250.00,3);
/*!40000 ALTER TABLE `payment_applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_terms`
--

DROP TABLE IF EXISTS `payment_terms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_terms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(50) NOT NULL,
  `days` int NOT NULL DEFAULT '30',
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `discount_days` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_terms`
--

LOCK TABLES `payment_terms` WRITE;
/*!40000 ALTER TABLE `payment_terms` DISABLE KEYS */;
INSERT INTO `payment_terms` VALUES (1,'NET10','Net 10',10,0.00,0,1,'2026-06-26 03:52:53'),(2,'NET30','Net 30',30,0.00,0,1,'2026-06-26 03:52:53'),(3,'NET45','Net 45',45,0.00,0,1,'2026-06-26 03:52:53'),(4,'NET60','Net 60',60,0.00,0,1,'2026-06-26 03:52:53'),(5,'2/10NET30','2% 10 Net 30',30,2.00,10,1,'2026-06-26 03:52:53'),(6,'COD','Cash on Delivery',0,0.00,0,1,'2026-06-26 03:52:53'),(7,'PREPAID','Prepaid',0,0.00,0,1,'2026-06-26 03:52:53');
/*!40000 ALTER TABLE `payment_terms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `physical_count_lines`
--

DROP TABLE IF EXISTS `physical_count_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `physical_count_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `count_id` int NOT NULL,
  `item_id` int NOT NULL,
  `location_id` int DEFAULT NULL,
  `system_qty` decimal(12,4) DEFAULT '0.0000',
  `counted_qty` decimal(12,4) DEFAULT '0.0000',
  `variance_qty` decimal(12,4) DEFAULT '0.0000',
  `lot_number` varchar(50) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `count_id` (`count_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `physical_count_lines_ibfk_1` FOREIGN KEY (`count_id`) REFERENCES `physical_counts` (`id`),
  CONSTRAINT `physical_count_lines_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `physical_count_lines`
--

LOCK TABLES `physical_count_lines` WRITE;
/*!40000 ALTER TABLE `physical_count_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `physical_count_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `physical_counts`
--

DROP TABLE IF EXISTS `physical_counts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `physical_counts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `count_number` varchar(20) NOT NULL,
  `count_date` date NOT NULL,
  `location_id` int DEFAULT NULL,
  `status` enum('draft','in_progress','completed','posted') DEFAULT 'draft',
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `count_number` (`count_number`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `physical_counts`
--

LOCK TABLES `physical_counts` WRITE;
/*!40000 ALTER TABLE `physical_counts` DISABLE KEYS */;
INSERT INTO `physical_counts` VALUES (1,'PC-01001','2026-06-26',1,'draft','Q2 2026 Raw Glass Count',1,'2026-06-26 19:21:31'),(2,'PC-01002','2026-06-26',1,'draft','Q2 2026 Full Glass Inventory',1,'2026-06-26 19:26:48');
/*!40000 ALTER TABLE `physical_counts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `po_lines`
--

DROP TABLE IF EXISTS `po_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `po_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_order_id` int NOT NULL,
  `line_number` int NOT NULL,
  `item_id` int NOT NULL,
  `vendor_item_number` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity_ordered` decimal(12,4) NOT NULL,
  `quantity_received` decimal(12,4) DEFAULT '0.0000',
  `uom` varchar(20) DEFAULT NULL,
  `unit_cost` decimal(12,4) NOT NULL,
  `line_total` decimal(12,2) DEFAULT '0.00',
  `required_date` date DEFAULT NULL,
  `status` enum('open','partial','complete','cancelled') DEFAULT 'open',
  `gl_account` varchar(20) DEFAULT NULL,
  `notes` text,
  `glass_type` varchar(50) DEFAULT NULL,
  `thickness` varchar(20) DEFAULT NULL,
  `width` decimal(8,2) DEFAULT NULL,
  `height` decimal(8,2) DEFAULT NULL,
  `edge_type` varchar(50) DEFAULT NULL,
  `quantity_cancelled` decimal(12,4) DEFAULT '0.0000',
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `idx_pol_po` (`purchase_order_id`),
  CONSTRAINT `po_lines_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `po_lines_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `po_lines`
--

LOCK TABLES `po_lines` WRITE;
/*!40000 ALTER TABLE `po_lines` DISABLE KEYS */;
INSERT INTO `po_lines` VALUES (1,1,1,2,NULL,'Raw Glass Sheet',20.0000,15.0000,'Each',25.0000,500.00,NULL,'cancelled',NULL,NULL,'Clear Float','6mm',96.00,130.00,NULL,5.0000),(2,2,1,2,NULL,'Raw Glass Sheet 48x96',50.0000,100.0000,'Each',45.0000,2250.00,NULL,'open',NULL,NULL,'Low-E','8mm',48.00,84.00,NULL,0.0000),(3,3,1,2,NULL,'Clear Float Glass 48x96',20.0000,10.0000,NULL,55.0000,1100.00,NULL,'partial',NULL,NULL,'Clear Float','6mm',48.00,96.00,NULL,0.0000),(4,3,2,2,NULL,'Low-E Glass 36x72',10.0000,5.0000,NULL,70.0000,700.00,NULL,'partial',NULL,NULL,'Low-E','8mm',36.00,72.00,NULL,0.0000);
/*!40000 ALTER TABLE `po_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `po_receipt_lines`
--

DROP TABLE IF EXISTS `po_receipt_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `po_receipt_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_id` int NOT NULL,
  `po_line_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity_received` decimal(12,4) NOT NULL,
  `quantity_rejected` decimal(12,4) DEFAULT '0.0000',
  `unit_cost` decimal(12,4) DEFAULT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `notes` text,
  `po_receipt_id` int DEFAULT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `reject_reason` varchar(200) DEFAULT NULL,
  `storage_location` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `receipt_id` (`receipt_id`),
  KEY `po_line_id` (`po_line_id`),
  KEY `item_id` (`item_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `po_receipt_lines_ibfk_1` FOREIGN KEY (`receipt_id`) REFERENCES `po_receipts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `po_receipt_lines_ibfk_2` FOREIGN KEY (`po_line_id`) REFERENCES `po_lines` (`id`),
  CONSTRAINT `po_receipt_lines_ibfk_3` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `po_receipt_lines_ibfk_4` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `po_receipt_lines`
--

LOCK TABLES `po_receipt_lines` WRITE;
/*!40000 ALTER TABLE `po_receipt_lines` DISABLE KEYS */;
INSERT INTO `po_receipt_lines` VALUES (1,2,1,2,10.0000,0.0000,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL),(2,3,2,2,50.0000,0.0000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3,4,2,2,50.0000,0.0000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(5,6,1,2,5.0000,0.0000,125.0000,'LOT-2026-001',NULL,4,NULL,NULL,'POR-01008-1-MQUCBNXJ',NULL,'Rack A, Slot 3'),(6,7,3,2,10.0000,0.0000,NULL,'LOT-CF-2026-001',NULL,7,NULL,NULL,'POR-01009-3-MQUCTVRW',NULL,NULL),(7,8,4,2,5.0000,0.0000,45.0000,NULL,NULL,1,NULL,NULL,'POR-01010-4-MQWE7ZA0',NULL,NULL);
/*!40000 ALTER TABLE `po_receipt_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `po_receipts`
--

DROP TABLE IF EXISTS `po_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `po_receipts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(20) NOT NULL,
  `purchase_order_id` int NOT NULL,
  `vendor_id` int NOT NULL,
  `receipt_date` date NOT NULL,
  `packing_slip_number` varchar(50) DEFAULT NULL,
  `status` enum('draft','received','posted') DEFAULT 'draft',
  `notes` text,
  `received_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `location_id` int DEFAULT NULL,
  `vendor_invoice_number` varchar(50) DEFAULT NULL,
  `ap_invoice_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `receipt_number` (`receipt_number`),
  KEY `purchase_order_id` (`purchase_order_id`),
  KEY `vendor_id` (`vendor_id`),
  CONSTRAINT `po_receipts_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`),
  CONSTRAINT `po_receipts_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `po_receipts`
--

LOCK TABLES `po_receipts` WRITE;
/*!40000 ALTER TABLE `po_receipts` DISABLE KEYS */;
INSERT INTO `po_receipts` VALUES (1,'POR-01002',1,1,'2026-06-25',NULL,'draft',NULL,1,'2026-06-25 23:42:46',1,NULL,NULL),(2,'POR-01003',1,1,'2026-06-25',NULL,'draft',NULL,1,'2026-06-25 23:43:24',1,NULL,NULL),(3,'POR-01005',2,1,'2026-06-26',NULL,'draft',NULL,1,'2026-06-26 00:14:00',NULL,NULL,NULL),(4,'POR-01006',2,1,'2026-06-26',NULL,'draft',NULL,1,'2026-06-26 00:14:30',NULL,NULL,NULL),(6,'POR-01008',1,1,'2026-06-26','PS-12345','received','Test receipt - glass panels',1,'2026-06-26 02:57:15',4,NULL,3),(7,'POR-01009',3,1,'2026-06-26','PS-44521','received',NULL,1,'2026-06-26 03:11:25',7,NULL,4),(8,'POR-01010',3,1,'2026-06-27',NULL,'received','Phase 2 GL test',1,'2026-06-27 13:25:55',1,NULL,NULL);
/*!40000 ALTER TABLE `po_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `price_lists`
--

DROP TABLE IF EXISTS `price_lists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `price_lists` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `markup_percent` decimal(5,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `price_lists`
--

LOCK TABLES `price_lists` WRITE;
/*!40000 ALTER TABLE `price_lists` DISABLE KEYS */;
/*!40000 ALTER TABLE `price_lists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pricing_matrix`
--

DROP TABLE IF EXISTS `pricing_matrix`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pricing_matrix` (
  `id` int NOT NULL AUTO_INCREMENT,
  `glass_type` varchar(50) NOT NULL,
  `thickness` varchar(20) NOT NULL,
  `price_per_sqft` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `min_sqft` decimal(10,4) DEFAULT '3.0000',
  `min_charge` decimal(10,2) DEFAULT '0.00',
  `markup_percent` decimal(5,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_glass_thickness` (`glass_type`,`thickness`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pricing_matrix`
--

LOCK TABLES `pricing_matrix` WRITE;
/*!40000 ALTER TABLE `pricing_matrix` DISABLE KEYS */;
INSERT INTO `pricing_matrix` VALUES (1,'Clear Annealed','1/8\"',4.5000,3.0000,15.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(2,'Clear Annealed','3/16\"',5.5000,3.0000,18.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(3,'Clear Annealed','1/4\"',7.0000,3.0000,22.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(4,'Clear Annealed','3/8\"',12.0000,3.0000,38.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(5,'Clear Annealed','1/2\"',18.0000,3.0000,55.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(6,'Clear Annealed','3/4\"',28.0000,3.0000,85.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(7,'Clear Tempered','1/8\"',8.0000,3.0000,25.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(8,'Clear Tempered','3/16\"',9.5000,3.0000,30.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(9,'Clear Tempered','1/4\"',12.0000,3.0000,38.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(10,'Clear Tempered','3/8\"',18.0000,3.0000,55.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(11,'Clear Tempered','1/2\"',26.0000,3.0000,80.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(12,'Low-E','1/4\"',14.0000,3.0000,44.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(13,'Low-E','3/8\"',20.0000,3.0000,62.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(14,'Low-E','1/2\"',30.0000,3.0000,92.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(15,'Tinted (Gray)','1/4\"',9.0000,3.0000,28.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(16,'Tinted (Bronze)','1/4\"',9.0000,3.0000,28.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(17,'Tinted (Green)','1/4\"',9.5000,3.0000,30.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(18,'Laminated','1/4\"',16.0000,3.0000,50.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(19,'Laminated','3/8\"',22.0000,3.0000,68.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(20,'Laminated','1/2\"',32.0000,3.0000,98.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(21,'Mirror','1/4\"',10.0000,3.0000,32.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(22,'Starphire (Ultra Clear)','1/4\"',14.0000,3.0000,44.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(23,'Starphire (Ultra Clear)','3/8\"',20.0000,3.0000,62.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40'),(24,'Starphire (Ultra Clear)','1/2\"',30.0000,3.0000,92.00,0.00,1,'2026-06-27 17:55:40','2026-06-27 17:55:40');
/*!40000 ALTER TABLE `pricing_matrix` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_scans`
--

DROP TABLE IF EXISTS `production_scans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_scans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `station` varchar(100) NOT NULL,
  `status` varchar(50) DEFAULT 'completed',
  `notes` text,
  `scanned_by` int DEFAULT NULL,
  `scanned_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wo` (`work_order_id`),
  KEY `idx_station` (`station`),
  KEY `idx_time` (`scanned_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_scans`
--

LOCK TABLES `production_scans` WRITE;
/*!40000 ALTER TABLE `production_scans` DISABLE KEYS */;
INSERT INTO `production_scans` VALUES (1,1,'Tempering','completed',NULL,1,'2026-06-26 22:31:53'),(2,1,'general','completed',NULL,1,'2026-06-26 22:33:59'),(3,1,'general','completed',NULL,1,'2026-06-26 22:35:51'),(4,1,'Tempering','completed',NULL,1,'2026-06-26 22:42:00');
/*!40000 ALTER TABLE `production_scans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_schedule_entries`
--

DROP TABLE IF EXISTS `production_schedule_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_schedule_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `work_center_id` int DEFAULT NULL,
  `routing_step_id` int DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `scheduled_start` datetime NOT NULL,
  `scheduled_end` datetime NOT NULL,
  `actual_start` datetime DEFAULT NULL,
  `actual_end` datetime DEFAULT NULL,
  `duration_hours` decimal(8,2) DEFAULT NULL,
  `status` enum('planned','scheduled','in-progress','completed','delayed','blocked') DEFAULT 'planned',
  `priority` int DEFAULT '5',
  `dependencies` json DEFAULT NULL,
  `assigned_to` varchar(100) DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `work_center_id` (`work_center_id`),
  CONSTRAINT `production_schedule_entries_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `production_schedule_entries_ibfk_2` FOREIGN KEY (`work_center_id`) REFERENCES `work_centers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_schedule_entries`
--

LOCK TABLES `production_schedule_entries` WRITE;
/*!40000 ALTER TABLE `production_schedule_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_schedule_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `po_number` varchar(20) NOT NULL,
  `vendor_id` int NOT NULL,
  `po_type` enum('standard','blanket','buyout','supporting') DEFAULT 'standard',
  `order_date` date NOT NULL,
  `required_date` date DEFAULT NULL,
  `promised_date` date DEFAULT NULL,
  `status` enum('draft','open','sent','partial','received','closed','cancelled') DEFAULT 'draft',
  `work_order_id` int DEFAULT NULL,
  `sales_order_id` int DEFAULT NULL,
  `ship_to_location_id` int DEFAULT NULL,
  `fob` varchar(50) DEFAULT NULL,
  `ship_via` varchar(50) DEFAULT NULL,
  `subtotal` decimal(12,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) DEFAULT '0.00',
  `freight_amount` decimal(12,2) DEFAULT '0.00',
  `total` decimal(12,2) DEFAULT '0.00',
  `notes` text,
  `internal_notes` text,
  `created_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_date` datetime DEFAULT NULL,
  `po_printed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approved_at` datetime DEFAULT NULL,
  `closed_by` int DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `sent_by` int DEFAULT NULL,
  `vendor_contact` varchar(100) DEFAULT NULL,
  `payment_terms` varchar(50) DEFAULT NULL,
  `freight_terms` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `po_number` (`po_number`),
  KEY `vendor_id` (`vendor_id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `sales_order_id` (`sales_order_id`),
  KEY `ship_to_location_id` (`ship_to_location_id`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`),
  CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `purchase_orders_ibfk_3` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `purchase_orders_ibfk_4` FOREIGN KEY (`ship_to_location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
INSERT INTO `purchase_orders` VALUES (1,'PO-05002',1,'standard','2026-06-25','2026-07-05',NULL,'closed',NULL,NULL,NULL,NULL,NULL,500.00,0.00,0.00,500.00,'Raw glass order',NULL,1,NULL,NULL,0,'2026-06-25 23:39:53','2026-06-26 02:59:22',NULL,1,'2026-06-26 02:59:22',NULL,NULL,NULL,NULL,NULL),(2,'PO-05003',1,'standard','2026-06-25','2026-07-01',NULL,'closed',NULL,NULL,NULL,NULL,NULL,2250.00,0.00,0.00,2250.00,NULL,NULL,1,1,NULL,0,'2026-06-26 00:13:07','2026-06-26 19:17:05','2026-06-26 00:14:00',1,'2026-06-26 19:17:05',NULL,NULL,NULL,NULL,NULL),(3,'PO-05004',1,'standard','2026-06-26','2026-07-10',NULL,'partial',NULL,NULL,NULL,NULL,NULL,1800.00,0.00,0.00,1800.00,'Test PO for full workflow',NULL,NULL,1,NULL,0,'2026-06-26 03:10:24','2026-06-27 00:32:13','2026-06-26 03:11:25',NULL,NULL,'2026-06-26 03:11:25',1,NULL,NULL,NULL);
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qc_inspections`
--

DROP TABLE IF EXISTS `qc_inspections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_inspections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `wo_routing_id` int DEFAULT NULL,
  `work_center_id` int DEFAULT NULL,
  `inspection_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `inspector_id` int DEFAULT NULL,
  `inspection_type` varchar(30) DEFAULT 'in_process',
  `result` varchar(20) NOT NULL,
  `quantity_inspected` decimal(12,4) DEFAULT '0.0000',
  `quantity_passed` decimal(12,4) DEFAULT '0.0000',
  `quantity_failed` decimal(12,4) DEFAULT '0.0000',
  `defect_type` varchar(50) DEFAULT NULL,
  `defect_description` text,
  `disposition` varchar(30) DEFAULT 'accept',
  `corrective_action` text,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `work_center_id` (`work_center_id`),
  CONSTRAINT `qc_inspections_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `qc_inspections_ibfk_2` FOREIGN KEY (`work_center_id`) REFERENCES `work_centers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qc_inspections`
--

LOCK TABLES `qc_inspections` WRITE;
/*!40000 ALTER TABLE `qc_inspections` DISABLE KEYS */;
/*!40000 ALTER TABLE `qc_inspections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quality_ncr`
--

DROP TABLE IF EXISTS `quality_ncr`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quality_ncr` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ncr_number` varchar(20) NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `item_id` int DEFAULT NULL,
  `operation_id` int DEFAULT NULL,
  `ncr_date` date NOT NULL,
  `defect_type` enum('crack','chip','scratch','dimension','coating','inclusion','warp','other') NOT NULL,
  `severity` enum('minor','major','critical') NOT NULL DEFAULT 'major',
  `quantity_affected` decimal(12,4) NOT NULL DEFAULT '1.0000',
  `description` text NOT NULL,
  `disposition` enum('pending','accept','rework','scrap','return_to_vendor') NOT NULL DEFAULT 'pending',
  `disposition_notes` text,
  `reported_by` int NOT NULL,
  `disposition_by` int DEFAULT NULL,
  `disposition_date` date DEFAULT NULL,
  `status` enum('open','in_review','closed') NOT NULL DEFAULT 'open',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ncr_number` (`ncr_number`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quality_ncr`
--

LOCK TABLES `quality_ncr` WRITE;
/*!40000 ALTER TABLE `quality_ncr` DISABLE KEYS */;
/*!40000 ALTER TABLE `quality_ncr` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quantity_breaks`
--

DROP TABLE IF EXISTS `quantity_breaks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quantity_breaks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `min_qty` int NOT NULL DEFAULT '1',
  `max_qty` int DEFAULT '999999',
  `discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quantity_breaks`
--

LOCK TABLES `quantity_breaks` WRITE;
/*!40000 ALTER TABLE `quantity_breaks` DISABLE KEYS */;
INSERT INTO `quantity_breaks` VALUES (1,'Standard (1-10)',1,10,0.00,1,'2026-06-27 17:55:40'),(2,'Volume 11-50',11,50,5.00,1,'2026-06-27 17:55:40'),(3,'Volume 51-100',51,100,10.00,1,'2026-06-27 17:55:40'),(4,'Bulk 100+',101,999999,15.00,1,'2026-06-27 17:55:40');
/*!40000 ALTER TABLE `quantity_breaks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quote_drawings`
--

DROP TABLE IF EXISTS `quote_drawings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quote_drawings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quote_id` int NOT NULL,
  `quote_line_id` int DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `revision` varchar(10) DEFAULT 'A',
  `status` enum('pending','approved','rejected','revise') DEFAULT 'pending',
  `approved_by` varchar(100) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `notes` text,
  `uploaded_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `quote_id` (`quote_id`),
  KEY `quote_line_id` (`quote_line_id`),
  CONSTRAINT `quote_drawings_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_drawings_ibfk_2` FOREIGN KEY (`quote_line_id`) REFERENCES `quote_lines` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quote_drawings`
--

LOCK TABLES `quote_drawings` WRITE;
/*!40000 ALTER TABLE `quote_drawings` DISABLE KEYS */;
INSERT INTO `quote_drawings` VALUES (1,4,NULL,'DT-Office-L3-Balustrade-Layout.pdf',NULL,'A','pending',NULL,NULL,'Overall layout drawing showing panel positions',1,'2026-06-26 02:09:01'),(2,4,NULL,'DT-Office-L3-Panel-Detail.pdf',NULL,'A','pending',NULL,NULL,'Panel detail with hole positions and edge specs',1,'2026-06-26 02:09:01');
/*!40000 ALTER TABLE `quote_drawings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quote_line_fabrication`
--

DROP TABLE IF EXISTS `quote_line_fabrication`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quote_line_fabrication` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quote_id` int NOT NULL,
  `quote_line_id` int NOT NULL,
  `fabrication_charge_id` int NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '1.00' COMMENT 'Number of holes, linear feet, pieces, etc.',
  `rate` decimal(10,2) NOT NULL COMMENT 'Rate at time of quote (copied from default_rate)',
  `total` decimal(10,2) NOT NULL COMMENT 'quantity * rate',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fabrication_charge_id` (`fabrication_charge_id`),
  CONSTRAINT `quote_line_fabrication_ibfk_1` FOREIGN KEY (`fabrication_charge_id`) REFERENCES `fabrication_charges` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quote_line_fabrication`
--

LOCK TABLES `quote_line_fabrication` WRITE;
/*!40000 ALTER TABLE `quote_line_fabrication` DISABLE KEYS */;
/*!40000 ALTER TABLE `quote_line_fabrication` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quote_lines`
--

DROP TABLE IF EXISTS `quote_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quote_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quote_id` int NOT NULL,
  `line_number` int NOT NULL,
  `item_id` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity` decimal(12,4) NOT NULL,
  `uom` varchar(20) DEFAULT NULL,
  `unit_price` decimal(12,4) NOT NULL,
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `line_total` decimal(12,2) DEFAULT '0.00',
  `width_inches` decimal(8,3) DEFAULT NULL,
  `height_inches` decimal(8,3) DEFAULT NULL,
  `sqft` decimal(10,4) DEFAULT NULL,
  `notes` text,
  `product_type` varchar(50) DEFAULT NULL,
  `glass_type` varchar(50) DEFAULT NULL,
  `thickness` varchar(20) DEFAULT NULL,
  `edge_type` varchar(50) DEFAULT NULL,
  `shape` varchar(30) DEFAULT 'rectangular',
  `interlayer` varchar(50) DEFAULT NULL,
  `has_holes` tinyint(1) DEFAULT '0',
  `holes_count` int DEFAULT '0',
  `cutouts` text,
  `coating` varchar(50) DEFAULT NULL,
  `spacer_type` varchar(50) DEFAULT NULL,
  `gas_fill` varchar(30) DEFAULT NULL,
  `manufacturing_notes` text,
  `drawing_ref` varchar(100) DEFAULT NULL,
  `cost_per_unit` decimal(12,4) DEFAULT '0.0000',
  `margin_percent` decimal(5,2) DEFAULT '0.00',
  `fabrication_total` decimal(12,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `quote_id` (`quote_id`),
  KEY `quote_lines_ibfk_2` (`item_id`),
  CONSTRAINT `quote_lines_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_lines_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quote_lines`
--

LOCK TABLES `quote_lines` WRITE;
/*!40000 ALTER TABLE `quote_lines` DISABLE KEYS */;
INSERT INTO `quote_lines` VALUES (2,3,1,2,'Tempered Glass Panel 24x36',10.0000,'Each',125.0000,0.00,1250.00,24.000,36.000,6.0000,NULL,'tempered_panel','Clear Float','6mm','Flat Polish','rectangular',NULL,0,0,NULL,NULL,NULL,NULL,'Standard tempered panel - no special requirements',NULL,0.0000,0.00,0.00),(3,4,1,NULL,'Tempered Laminated Glass Panel 48x42',25.0000,'Each',285.0000,0.00,7125.00,48.000,42.000,14.0000,NULL,'tempered_laminated','Clear Float','10mm','Flat Polish','rectangular','PVB 0.76mm',1,4,NULL,NULL,NULL,NULL,'Standard balustrade panel with 4 mounting holes',NULL,0.0000,0.00,0.00),(4,4,2,NULL,'Tempered Laminated Glass Panel 36x42 (End Panel)',10.0000,'Each',225.0000,0.00,2250.00,36.000,42.000,10.5000,NULL,'tempered_laminated','Clear Float','10mm','Flat Polish','rectangular','PVB 0.76mm',1,4,NULL,NULL,NULL,NULL,'End panels - same spec as standard but narrower',NULL,0.0000,0.00,0.00),(5,4,3,NULL,'IGU Low-E Panel 60x72 (Curtain Wall)',15.0000,'Each',625.0000,0.00,9375.00,60.000,72.000,30.0000,NULL,'igu_low_e','Low-E','6mm','Seamed','rectangular',NULL,0,0,NULL,NULL,NULL,NULL,'IGU: 6mm Low-E / 12mm Argon / 6mm Clear. Warm edge spacer.',NULL,0.0000,0.00,0.00),(6,2,1,NULL,'Tempered Glass Storefront Panel 48x72',8.0000,'Each',185.0000,0.00,1480.00,48.000,72.000,24.0000,NULL,'tempered_panel','Clear Float','6mm','Flat Polish','rectangular',NULL,0,0,NULL,NULL,NULL,NULL,'Standard storefront panel - heat soak test required',NULL,0.0000,0.00,0.00),(7,2,2,NULL,'Tempered Glass Door Lite 24x60',4.0000,'Each',145.0000,0.00,580.00,24.000,60.000,10.0000,NULL,'tempered_panel','Clear Float','10mm','Pencil Polish','rectangular',NULL,1,2,NULL,NULL,NULL,NULL,'Door lite with 2 hinge holes - tight tolerance',NULL,0.0000,0.00,0.00),(8,2,3,NULL,'Spandrel Glass Panel 48x48 (Black)',6.0000,'Each',210.0000,0.00,1260.00,48.000,48.000,16.0000,NULL,'tempered_panel','Spandrel Black','6mm','Seamed','rectangular',NULL,0,0,NULL,NULL,NULL,NULL,'Black ceramic frit spandrel - tempered',NULL,0.0000,0.00,0.00),(9,6,1,2,'Tempered Glass Storefront Panel 48x96',5.0000,'Each',185.0000,0.00,925.00,NULL,NULL,NULL,NULL,'tempered_panel','Clear Float','8mm',NULL,'rectangular',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL,0.0000,0.00,0.00);
/*!40000 ALTER TABLE `quote_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotes`
--

DROP TABLE IF EXISTS `quotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quote_number` varchar(20) NOT NULL,
  `customer_id` int NOT NULL,
  `project_name` varchar(100) DEFAULT NULL,
  `quote_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `status` enum('draft','sent','pending_approval','accepted','rejected','expired','converted') DEFAULT 'draft',
  `revision_number` int DEFAULT '0',
  `valid_days` int DEFAULT '30',
  `payment_terms` varchar(50) DEFAULT 'Net 30',
  `lead_time_days` int DEFAULT NULL,
  `salesperson_id` int DEFAULT NULL,
  `subtotal` decimal(12,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) DEFAULT '0.00',
  `discount_amount` decimal(12,2) DEFAULT '0.00',
  `total` decimal(12,2) DEFAULT '0.00',
  `notes` text,
  `internal_notes` text,
  `terms_conditions` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `converted_to_order_id` int DEFAULT NULL,
  `currency_code` varchar(3) DEFAULT 'USD',
  `exchange_rate` decimal(12,6) DEFAULT '1.000000',
  `approval_status` enum('none','pending','approved','rejected') DEFAULT 'none',
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quote_number` (`quote_number`),
  KEY `customer_id` (`customer_id`),
  KEY `salesperson_id` (`salesperson_id`),
  CONSTRAINT `quotes_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `quotes_ibfk_2` FOREIGN KEY (`salesperson_id`) REFERENCES `salespeople` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotes`
--

LOCK TABLES `quotes` WRITE;
/*!40000 ALTER TABLE `quotes` DISABLE KEYS */;
INSERT INTO `quotes` VALUES (1,'QT-01001',1,NULL,'2026-06-25','2026-07-25','converted',0,30,'Net 30',NULL,NULL,1250.00,0.00,0.00,1250.00,NULL,NULL,NULL,1,'2026-06-26 00:10:43','2026-06-26 00:11:12',3,'USD',1.000000,'none',NULL,NULL),(2,'QT-01002',2,NULL,'2026-06-25','2026-07-25','converted',0,30,'Net 30',NULL,NULL,1250.00,0.00,0.00,3320.00,NULL,NULL,NULL,1,'2026-06-26 00:10:52','2026-06-26 02:31:11',6,'USD',1.000000,'none',NULL,NULL),(3,'QT-01003',2,NULL,'2026-06-25','2026-07-25','converted',0,30,'Net 30',NULL,NULL,1250.00,0.00,0.00,1250.00,NULL,NULL,NULL,1,'2026-06-26 00:11:12','2026-06-26 23:06:02',7,'USD',1.000000,'none',NULL,NULL),(4,'QT-01004',1,'Downtown Office Tower - Level 3 Balustrade','2026-06-26','2026-07-26','converted',0,30,'Net 30',21,NULL,18750.00,0.00,0.00,18750.00,NULL,NULL,NULL,1,'2026-06-26 02:09:01','2026-06-26 02:14:01',5,'USD',1.000000,'none',NULL,NULL),(6,'QT-01005',2,'Test Storefront Project','2026-06-26',NULL,'converted',0,30,'Net 30',21,NULL,925.00,0.00,0.00,925.00,NULL,NULL,NULL,1,'2026-06-26 23:33:47','2026-06-26 23:36:56',8,'USD',1.000000,'none',NULL,NULL);
/*!40000 ALTER TABLE `quotes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rack_loads`
--

DROP TABLE IF EXISTS `rack_loads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rack_loads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rack_id` int NOT NULL,
  `shipment_id` int DEFAULT NULL,
  `work_order_id` int DEFAULT NULL,
  `sales_order_id` int DEFAULT NULL,
  `loaded_by` int DEFAULT NULL,
  `loaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `unloaded_at` datetime DEFAULT NULL,
  `unloaded_by` int DEFAULT NULL,
  `load_sequence` int DEFAULT NULL,
  `piece_count` int DEFAULT NULL,
  `total_weight_lbs` decimal(10,2) DEFAULT NULL,
  `total_sqft` decimal(10,2) DEFAULT NULL,
  `notes` text,
  `status` enum('loading','loaded','in-transit','delivered','unloaded') DEFAULT 'loading',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `rack_id` (`rack_id`),
  KEY `shipment_id` (`shipment_id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `loaded_by` (`loaded_by`),
  CONSTRAINT `rack_loads_ibfk_1` FOREIGN KEY (`rack_id`) REFERENCES `racks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rack_loads_ibfk_2` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `rack_loads_ibfk_3` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `rack_loads_ibfk_4` FOREIGN KEY (`loaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rack_loads`
--

LOCK TABLES `rack_loads` WRITE;
/*!40000 ALTER TABLE `rack_loads` DISABLE KEYS */;
/*!40000 ALTER TABLE `rack_loads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rack_slots`
--

DROP TABLE IF EXISTS `rack_slots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rack_slots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rack_id` int NOT NULL,
  `slot_number` int NOT NULL,
  `slot_label` varchar(20) DEFAULT NULL,
  `status` enum('empty','occupied','reserved','damaged') DEFAULT 'empty',
  `work_order_id` int DEFAULT NULL,
  `sales_order_id` int DEFAULT NULL,
  `item_description` varchar(255) DEFAULT NULL,
  `width` decimal(10,2) DEFAULT NULL,
  `height` decimal(10,2) DEFAULT NULL,
  `thickness` varchar(20) DEFAULT NULL,
  `piece_count` int DEFAULT '0',
  `loaded_at` datetime DEFAULT NULL,
  `loaded_by` int DEFAULT NULL,
  `reserved_for_shipment_id` int DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rack_slot` (`rack_id`,`slot_number`),
  KEY `idx_rack_slots_status` (`status`),
  KEY `idx_rack_slots_wo` (`work_order_id`),
  KEY `idx_rack_slots_shipment` (`reserved_for_shipment_id`),
  CONSTRAINT `rack_slots_ibfk_1` FOREIGN KEY (`rack_id`) REFERENCES `racks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rack_slots`
--

LOCK TABLES `rack_slots` WRITE;
/*!40000 ALTER TABLE `rack_slots` DISABLE KEYS */;
/*!40000 ALTER TABLE `rack_slots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `racks`
--

DROP TABLE IF EXISTS `racks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `racks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rack_number` varchar(30) NOT NULL,
  `rack_type` enum('a-frame','l-rack','stillage','flat-bed','custom') NOT NULL,
  `capacity_sqft` decimal(10,2) DEFAULT NULL,
  `capacity_pieces` int DEFAULT NULL,
  `max_weight_lbs` decimal(10,2) DEFAULT NULL,
  `max_height_inches` decimal(10,2) DEFAULT NULL,
  `max_width_inches` decimal(10,2) DEFAULT NULL,
  `status` enum('available','loaded','in-transit','at-customer','maintenance','retired') DEFAULT 'available',
  `current_location` varchar(100) DEFAULT NULL,
  `current_shipment_id` int DEFAULT NULL,
  `last_inspection_date` date DEFAULT NULL,
  `next_inspection_date` date DEFAULT NULL,
  `notes` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rack_number` (`rack_number`),
  KEY `current_shipment_id` (`current_shipment_id`),
  CONSTRAINT `racks_ibfk_1` FOREIGN KEY (`current_shipment_id`) REFERENCES `shipments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `racks`
--

LOCK TABLES `racks` WRITE;
/*!40000 ALTER TABLE `racks` DISABLE KEYS */;
INSERT INTO `racks` VALUES (1,'RACK-001','a-frame',120.00,20,2000.00,96.00,144.00,'available','Warehouse',NULL,NULL,NULL,NULL,1,'2026-06-27 10:08:17','2026-06-27 10:08:17'),(2,'RACK-002','a-frame',120.00,20,2000.00,96.00,144.00,'available','Warehouse',NULL,NULL,NULL,NULL,1,'2026-06-27 10:08:17','2026-06-27 10:08:17'),(3,'RACK-003','a-frame',80.00,15,1500.00,84.00,120.00,'available','Warehouse',NULL,NULL,NULL,NULL,1,'2026-06-27 10:08:17','2026-06-27 10:08:17'),(4,'RACK-004','l-rack',60.00,10,1000.00,72.00,96.00,'available','Warehouse',NULL,NULL,NULL,NULL,1,'2026-06-27 10:08:17','2026-06-27 10:08:17'),(5,'RACK-005','l-rack',60.00,10,1000.00,72.00,96.00,'available','Warehouse',NULL,NULL,NULL,NULL,1,'2026-06-27 10:08:17','2026-06-27 10:08:17'),(6,'RACK-006','stillage',200.00,30,3000.00,108.00,168.00,'available','Warehouse',NULL,NULL,NULL,NULL,1,'2026-06-27 10:08:17','2026-06-27 10:08:17'),(7,'RACK-007','flat-bed',300.00,50,5000.00,120.00,240.00,'available','Warehouse',NULL,NULL,NULL,NULL,1,'2026-06-27 10:08:17','2026-06-27 10:08:17'),(8,'RACK-008','a-frame',120.00,20,2000.00,96.00,144.00,'available','Warehouse',NULL,NULL,NULL,NULL,1,'2026-06-27 10:08:17','2026-06-27 10:08:17');
/*!40000 ALTER TABLE `racks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recuts`
--

DROP TABLE IF EXISTS `recuts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recuts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `work_center_id` int DEFAULT NULL,
  `quantity` decimal(12,4) NOT NULL,
  `reason_code` varchar(20) DEFAULT NULL,
  `notes` text,
  `reported_by` int DEFAULT NULL,
  `reported_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `work_center_id` (`work_center_id`),
  CONSTRAINT `recuts_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `recuts_ibfk_2` FOREIGN KEY (`work_center_id`) REFERENCES `work_centers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recuts`
--

LOCK TABLES `recuts` WRITE;
/*!40000 ALTER TABLE `recuts` DISABLE KEYS */;
INSERT INTO `recuts` VALUES (1,1,6,1.0000,'wrong_size','',1,'2026-06-26 12:04:51'),(2,2,2,1.0000,'wrong_size','',1,'2026-06-26 16:09:46');
/*!40000 ALTER TABLE `recuts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `remnants`
--

DROP TABLE IF EXISTS `remnants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `remnants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `glass_type` varchar(50) NOT NULL,
  `thickness` varchar(20) NOT NULL,
  `width` decimal(10,4) NOT NULL COMMENT 'inches',
  `height` decimal(10,4) NOT NULL COMMENT 'inches',
  `location` varchar(100) DEFAULT 'Remnant Rack',
  `rack_position` varchar(50) DEFAULT NULL,
  `quality` varchar(20) DEFAULT 'good' COMMENT 'good, fair, edge_chip',
  `source_sheet_id` int DEFAULT NULL,
  `source_cut_plan_id` int DEFAULT NULL,
  `source_wo_id` int DEFAULT NULL,
  `status` varchar(20) DEFAULT 'available' COMMENT 'available, reserved, consumed, scrapped',
  `reserved_for_wo_id` int DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT '0.00',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `source_sheet_id` (`source_sheet_id`),
  CONSTRAINT `remnants_ibfk_1` FOREIGN KEY (`source_sheet_id`) REFERENCES `sheet_stock` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `remnants`
--

LOCK TABLES `remnants` WRITE;
/*!40000 ALTER TABLE `remnants` DISABLE KEYS */;
INSERT INTO `remnants` VALUES (1,'Clear','6mm',45.0000,52.0000,'Remnant Rack','R1-A','good',NULL,NULL,NULL,'available',NULL,22.50,NULL,'2026-06-26 14:12:04','2026-06-26 14:12:04'),(2,'Clear','6mm',66.0000,78.0000,'Remnant Rack','R1-B','good',NULL,NULL,NULL,'available',NULL,49.50,NULL,'2026-06-26 14:12:04','2026-06-26 14:12:04'),(3,'Clear','10mm',30.0000,48.0000,'Remnant Rack','R2-A','good',NULL,NULL,NULL,'available',NULL,18.75,NULL,'2026-06-26 14:12:04','2026-06-26 14:12:04'),(4,'Low-E','6mm',36.0000,60.0000,'Remnant Rack','R3-A','fair',NULL,NULL,NULL,'available',NULL,28.00,NULL,'2026-06-26 14:12:04','2026-06-26 14:12:04'),(5,'Clear','6mm',24.0000,36.0000,'Remnant Rack','R1-C','good',NULL,NULL,NULL,'available',NULL,8.50,NULL,'2026-06-26 14:12:04','2026-06-26 14:12:04');
/*!40000 ALTER TABLE `remnants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `module` varchar(50) NOT NULL,
  `permission` varchar(50) NOT NULL,
  `granted` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_module_perm` (`role_id`,`module`,`permission`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=197 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1,'system_setup','post',1),(2,1,'system_setup','approve',1),(3,1,'system_setup','delete',1),(4,1,'system_setup','edit',1),(5,1,'system_setup','create',1),(6,1,'system_setup','view',1),(7,1,'inventory','post',1),(8,1,'inventory','approve',1),(9,1,'inventory','delete',1),(10,1,'inventory','edit',1),(11,1,'inventory','create',1),(12,1,'inventory','view',1),(13,1,'sales','post',1),(14,1,'sales','approve',1),(15,1,'sales','delete',1),(16,1,'sales','edit',1),(17,1,'sales','create',1),(18,1,'sales','view',1),(19,1,'manufacturing','post',1),(20,1,'manufacturing','approve',1),(21,1,'manufacturing','delete',1),(22,1,'manufacturing','edit',1),(23,1,'manufacturing','create',1),(24,1,'manufacturing','view',1),(25,1,'purchasing','post',1),(26,1,'purchasing','approve',1),(27,1,'purchasing','delete',1),(28,1,'purchasing','edit',1),(29,1,'purchasing','create',1),(30,1,'purchasing','view',1),(31,1,'accounting','post',1),(32,1,'accounting','approve',1),(33,1,'accounting','delete',1),(34,1,'accounting','edit',1),(35,1,'accounting','create',1),(36,1,'accounting','view',1),(37,1,'reports','post',1),(38,1,'reports','approve',1),(39,1,'reports','delete',1),(40,1,'reports','edit',1),(41,1,'reports','create',1),(42,1,'reports','view',1),(64,2,'reports','view',1),(65,2,'accounting','view',1),(66,2,'purchasing','view',1),(67,2,'manufacturing','view',1),(68,2,'sales','view',1),(69,2,'inventory','view',1),(70,2,'reports','create',1),(71,2,'accounting','create',1),(72,2,'purchasing','create',1),(73,2,'manufacturing','create',1),(74,2,'sales','create',1),(75,2,'inventory','create',1),(76,2,'reports','edit',1),(77,2,'accounting','edit',1),(78,2,'purchasing','edit',1),(79,2,'manufacturing','edit',1),(80,2,'sales','edit',1),(81,2,'inventory','edit',1),(82,2,'reports','delete',1),(83,2,'accounting','delete',1),(84,2,'purchasing','delete',1),(85,2,'manufacturing','delete',1),(86,2,'sales','delete',1),(87,2,'inventory','delete',1),(88,2,'reports','approve',1),(89,2,'accounting','approve',1),(90,2,'purchasing','approve',1),(91,2,'manufacturing','approve',1),(92,2,'sales','approve',1),(93,2,'inventory','approve',1),(94,2,'reports','post',1),(95,2,'accounting','post',1),(96,2,'purchasing','post',1),(97,2,'manufacturing','post',1),(98,2,'sales','post',1),(99,2,'inventory','post',1),(127,2,'system_setup','view',1),(128,2,'system_setup','create',1),(129,2,'system_setup','edit',1),(130,3,'sales','view',1),(131,3,'sales','create',1),(132,3,'sales','edit',1),(133,3,'sales','delete',1),(134,3,'sales','approve',1),(135,3,'sales','post',1),(137,3,'inventory','view',1),(138,3,'manufacturing','view',1),(139,3,'reports','view',1),(140,4,'manufacturing','view',1),(141,4,'manufacturing','create',1),(142,4,'manufacturing','edit',1),(143,4,'manufacturing','delete',1),(147,4,'inventory','view',1),(148,4,'reports','view',1),(150,5,'inventory','view',1),(151,5,'purchasing','view',1),(152,5,'inventory','create',1),(153,5,'purchasing','create',1),(154,5,'inventory','edit',1),(155,5,'purchasing','edit',1),(156,5,'inventory','delete',1),(157,5,'purchasing','delete',1),(158,5,'inventory','approve',1),(159,5,'purchasing','approve',1),(160,5,'inventory','post',1),(161,5,'purchasing','post',1),(165,5,'reports','view',1),(166,6,'accounting','view',1),(167,6,'accounting','create',1),(168,6,'accounting','edit',1),(169,6,'accounting','delete',1),(170,6,'accounting','approve',1),(171,6,'accounting','post',1),(173,6,'sales','view',1),(174,6,'purchasing','view',1),(175,6,'inventory','view',1),(176,6,'reports','view',1),(180,7,'inventory','view',1),(181,7,'inventory','create',1),(182,7,'inventory','edit',1),(183,7,'sales','view',1),(184,7,'purchasing','view',1),(185,7,'manufacturing','view',1),(186,7,'reports','view',1),(190,8,'system_setup','view',1),(191,8,'inventory','view',1),(192,8,'sales','view',1),(193,8,'manufacturing','view',1),(194,8,'purchasing','view',1),(195,8,'accounting','view',1),(196,8,'reports','view',1);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_system` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin','Full system administrator - unrestricted access',1,1,'2026-06-26 12:02:32','2026-06-26 12:02:32'),(2,'manager','Operations manager - full access except system setup',1,1,'2026-06-26 12:02:32','2026-06-26 12:02:32'),(3,'sales','Sales department - Quotes, Orders, Invoices, Customers',1,1,'2026-06-26 12:02:32','2026-06-26 12:02:32'),(4,'production','Manufacturing - Work Orders, Shop Floor, Quality',1,1,'2026-06-26 12:02:32','2026-06-26 12:02:32'),(5,'purchasing','Purchasing - POs, Vendors, Receipts, AP Invoices',1,1,'2026-06-26 12:02:32','2026-06-26 12:02:32'),(6,'accounting','Finance - GL, AP, AR, Bank, Financial Reports',1,1,'2026-06-26 12:02:32','2026-06-26 12:02:32'),(7,'shipping','Shipping/Receiving - Shipments, Receipts, Inventory',1,1,'2026-06-26 12:02:32','2026-06-26 12:02:32'),(8,'readonly','View-only access - cannot modify any data',1,1,'2026-06-26 12:02:32','2026-06-26 12:02:32');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `routing_operations`
--

DROP TABLE IF EXISTS `routing_operations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `routing_operations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `routing_id` int NOT NULL,
  `sequence` int NOT NULL,
  `work_center_id` int NOT NULL,
  `operation_description` varchar(255) DEFAULT NULL,
  `setup_time_hours` decimal(8,4) DEFAULT '0.0000',
  `run_time_hours` decimal(8,4) DEFAULT '0.0000',
  `overlap_percent` decimal(5,2) DEFAULT '0.00',
  `efficiency_percent` decimal(5,2) DEFAULT '100.00',
  `is_subcontract` tinyint(1) DEFAULT '0',
  `subcontract_vendor_id` int DEFAULT NULL,
  `instructions` text,
  PRIMARY KEY (`id`),
  KEY `routing_id` (`routing_id`),
  KEY `work_center_id` (`work_center_id`),
  CONSTRAINT `routing_operations_ibfk_1` FOREIGN KEY (`routing_id`) REFERENCES `routings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `routing_operations_ibfk_2` FOREIGN KEY (`work_center_id`) REFERENCES `work_centers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `routing_operations`
--

LOCK TABLES `routing_operations` WRITE;
/*!40000 ALTER TABLE `routing_operations` DISABLE KEYS */;
INSERT INTO `routing_operations` VALUES (1,1,1,1,'Cut to size',0.2500,0.5000,0.00,100.00,0,NULL,NULL),(2,1,2,2,'Edge polishing',0.1000,0.7500,0.00,100.00,0,NULL,NULL),(3,1,3,5,'Wash and prep',0.0000,0.2500,0.00,100.00,0,NULL,NULL),(4,1,4,6,'Tempering',0.5000,1.5000,0.00,100.00,0,NULL,NULL);
/*!40000 ALTER TABLE `routing_operations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `routing_template_operations`
--

DROP TABLE IF EXISTS `routing_template_operations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `routing_template_operations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `sequence` int NOT NULL,
  `work_center_id` int NOT NULL,
  `operation_description` varchar(255) DEFAULT NULL,
  `setup_time_hours` decimal(8,4) DEFAULT '0.0000',
  `run_time_per_unit` decimal(8,4) DEFAULT '0.0000',
  `qc_required` tinyint(1) DEFAULT '0',
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  KEY `work_center_id` (`work_center_id`),
  CONSTRAINT `routing_template_operations_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `routing_templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `routing_template_operations_ibfk_2` FOREIGN KEY (`work_center_id`) REFERENCES `work_centers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=93 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `routing_template_operations`
--

LOCK TABLES `routing_template_operations` WRITE;
/*!40000 ALTER TABLE `routing_template_operations` DISABLE KEYS */;
INSERT INTO `routing_template_operations` VALUES (47,1,10,1,'Cut glass to size per drawing',0.2500,0.0200,0,NULL),(48,1,20,2,'Edge processing per spec',0.1500,0.0300,0,NULL),(49,1,30,5,'Wash and dry before tempering',0.1000,0.0100,0,NULL),(50,1,40,6,'Temper in furnace per glass spec',0.5000,0.0500,0,NULL),(51,1,50,8,'Quality inspection - visual and stress test',0.1000,0.0200,1,NULL),(52,1,60,9,'Pack for shipment or storage',0.1000,0.0200,0,NULL),(53,2,10,1,'Cut glass lites to size',0.2500,0.0200,0,NULL),(54,2,20,2,'Edge processing - seamed or polished',0.1500,0.0300,0,NULL),(55,2,30,5,'Wash and dry before lamination',0.1000,0.0100,0,NULL),(56,2,40,7,'Laminate with PVB/SGP interlayer in autoclave',0.5000,0.1000,0,NULL),(57,2,50,8,'Quality inspection - delamination check',0.1000,0.0200,1,NULL),(58,2,60,9,'Pack for shipment',0.1000,0.0200,0,NULL),(59,3,10,1,'Cut glass lites to size',0.2500,0.0200,0,NULL),(60,3,20,2,'Edge processing per spec',0.1500,0.0300,0,NULL),(61,3,30,3,'CNC holes/notches if required',0.3000,0.0500,0,NULL),(62,3,40,5,'Wash and dry before tempering',0.1000,0.0100,0,NULL),(63,3,50,6,'Temper in furnace',0.5000,0.0500,0,NULL),(64,3,60,8,'Post-temper quality check',0.1000,0.0200,1,NULL),(65,3,70,5,'Wash before lamination',0.1000,0.0100,0,NULL),(66,3,80,7,'Laminate tempered lites with interlayer',0.5000,0.1000,0,NULL),(67,3,90,8,'Final quality inspection',0.1000,0.0200,1,NULL),(68,3,100,9,'Pack for shipment',0.1000,0.0200,0,NULL),(69,4,10,1,'Cut glass lites to size',0.2500,0.0200,0,NULL),(70,4,20,2,'Edge processing - pencil or flat',0.1500,0.0300,0,NULL),(71,4,30,5,'Wash and dry',0.1000,0.0100,0,NULL),(72,4,40,6,'Temper lites in furnace',0.5000,0.0500,0,NULL),(73,4,50,8,'Post-temper quality check',0.1000,0.0200,1,NULL),(74,4,60,17,'Assemble IGU - spacer, seal, gas fill',0.3000,0.0800,0,NULL),(75,4,70,8,'Final QC - seal integrity, argon fill',0.1000,0.0200,1,NULL),(76,4,80,9,'Pack IGU units for shipment',0.1000,0.0300,0,NULL),(77,5,10,1,'Cut Low-E coated glass (coat side up)',0.2500,0.0300,0,NULL),(78,5,20,2,'Edge processing - edge deletion zone',0.2000,0.0400,0,NULL),(79,5,30,5,'Wash - gentle cycle for Low-E coating',0.1000,0.0200,0,NULL),(80,5,40,6,'Temper Low-E lite in furnace',0.5000,0.0500,0,NULL),(81,5,50,8,'QC - check coating integrity',0.1000,0.0200,1,NULL),(82,5,60,17,'Assemble IGU - warm edge spacer, argon fill',0.3000,0.1000,0,NULL),(83,5,70,8,'Final QC - seal test, Low-E performance',0.1000,0.0200,1,NULL),(84,5,80,9,'Pack with coating protection',0.1000,0.0300,0,NULL),(85,6,10,1,'Cut glass to size per drawing',0.2500,0.0200,0,NULL),(86,6,20,2,'Edge processing per spec',0.1500,0.0300,0,NULL),(87,6,30,3,'CNC holes/notches if required',0.3000,0.0500,0,NULL),(88,6,40,5,'Wash and dry before tempering',0.1000,0.0100,0,NULL),(89,6,50,6,'Temper in furnace',0.5000,0.0500,0,NULL),(90,6,60,16,'Heat soak test - 2hr at 290C per EN 14179',0.2500,0.2000,0,NULL),(91,6,70,8,'Quality inspection - NiS inclusion check',0.1000,0.0200,1,NULL),(92,6,80,9,'Pack for shipment',0.1000,0.0200,0,NULL);
/*!40000 ALTER TABLE `routing_template_operations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `routing_templates`
--

DROP TABLE IF EXISTS `routing_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `routing_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `product_type` varchar(50) NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `routing_templates`
--

LOCK TABLES `routing_templates` WRITE;
/*!40000 ALTER TABLE `routing_templates` DISABLE KEYS */;
INSERT INTO `routing_templates` VALUES (1,'TEMP_PANEL','Tempered Panel','tempered_panel','Standard tempered glass panel - cut, edge, wash, temper, QC, pack',1,'2026-06-26 01:16:52'),(2,'LAM_GLASS','Laminated Glass','laminated','Laminated safety glass - cut, edge, wash, laminate, QC, pack',1,'2026-06-26 01:16:52'),(3,'TEMP_LAM','Tempered Laminated','tempered_laminated','Tempered then laminated - cut, edge, CNC, wash, temper, QC, wash, laminate, QC, pack',1,'2026-06-26 01:16:52'),(4,'IGU_STD','Standard IGU','igu','Double pane insulated glass unit - cut, edge, wash, temper, QC, IGU assembly, QC, pack',1,'2026-06-26 01:16:52'),(5,'LOW_E_IGU','Low-E IGU','low_e_igu','Low-E coated insulated glass unit - cut, edge, wash, temper, QC, IGU assembly, QC, pack',1,'2026-06-26 01:16:52'),(6,'HST_PANEL','Heat Soaked Tempered','heat_soaked','Heat soak tested tempered panel - cut, edge, CNC, wash, temper, heat soak, QC, pack',1,'2026-06-26 01:16:52'),(7,'CUSTOM','Custom Fabrication','custom','Custom routing - user defines operations',1,'2026-06-26 01:16:52');
/*!40000 ALTER TABLE `routing_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `routings`
--

DROP TABLE IF EXISTS `routings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `routings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `revision` varchar(20) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `routings_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `routings`
--

LOCK TABLES `routings` WRITE;
/*!40000 ALTER TABLE `routings` DISABLE KEYS */;
INSERT INTO `routings` VALUES (1,2,'A','Tempered Glass Panel Routing',1,'2026-06-26 10:51:22');
/*!40000 ALTER TABLE `routings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_order_lines`
--

DROP TABLE IF EXISTS `sales_order_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sales_order_id` int NOT NULL,
  `line_number` int NOT NULL,
  `item_id` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity_ordered` decimal(12,4) NOT NULL,
  `quantity_shipped` decimal(12,4) DEFAULT '0.0000',
  `quantity_backordered` decimal(12,4) DEFAULT '0.0000',
  `uom` varchar(20) DEFAULT NULL,
  `unit_price` decimal(12,4) NOT NULL,
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `line_total` decimal(12,2) DEFAULT '0.00',
  `width_inches` decimal(8,3) DEFAULT NULL,
  `height_inches` decimal(8,3) DEFAULT NULL,
  `sqft` decimal(10,4) DEFAULT NULL,
  `work_order_id` int DEFAULT NULL,
  `status` enum('open','partial','complete','cancelled') DEFAULT 'open',
  `required_date` date DEFAULT NULL,
  `notes` text,
  `product_type` varchar(50) DEFAULT NULL,
  `glass_type` varchar(50) DEFAULT NULL,
  `thickness` varchar(20) DEFAULT NULL,
  `edge_type` varchar(50) DEFAULT NULL,
  `shape` varchar(30) DEFAULT 'rectangular',
  `interlayer` varchar(50) DEFAULT NULL,
  `has_holes` tinyint(1) DEFAULT '0',
  `holes_count` int DEFAULT '0',
  `cutouts` text,
  `coating` varchar(50) DEFAULT NULL,
  `spacer_type` varchar(50) DEFAULT NULL,
  `gas_fill` varchar(30) DEFAULT NULL,
  `manufacturing_notes` text,
  `drawing_ref` varchar(100) DEFAULT NULL,
  `production_status` enum('pending','released','in_production','complete','shipped') DEFAULT 'pending',
  `has_notches` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `sales_order_id` (`sales_order_id`),
  KEY `item_id` (`item_id`),
  KEY `idx_sol_prod_status` (`production_status`),
  CONSTRAINT `sales_order_lines_ibfk_1` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_order_lines_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_order_lines`
--

LOCK TABLES `sales_order_lines` WRITE;
/*!40000 ALTER TABLE `sales_order_lines` DISABLE KEYS */;
INSERT INTO `sales_order_lines` VALUES (1,1,1,2,'Tempered Glass Panel 24x36',5.0000,18.0000,0.0000,'Each',89.9900,0.00,449.95,NULL,NULL,NULL,NULL,'open',NULL,NULL,NULL,NULL,NULL,NULL,'rectangular',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'shipped',0),(2,5,1,NULL,'Tempered Laminated Glass Panel 48x42',25.0000,30.0000,0.0000,'Each',285.0000,0.00,7125.00,48.000,42.000,14.0000,4,'open',NULL,NULL,'tempered_laminated','Clear Float','10mm','Flat Polish','rectangular','PVB 0.76mm',1,4,NULL,NULL,NULL,NULL,'Standard balustrade panel with 4 mounting holes',NULL,'shipped',0),(3,5,2,NULL,'Tempered Laminated Glass Panel 36x42 (End Panel)',10.0000,15.0000,0.0000,'Each',225.0000,0.00,2250.00,36.000,42.000,10.5000,5,'open',NULL,NULL,'tempered_laminated','Clear Float','10mm','Flat Polish','rectangular','PVB 0.76mm',1,4,NULL,NULL,NULL,NULL,'End panels - same spec as standard but narrower',NULL,'shipped',0),(4,5,3,NULL,'IGU Low-E Panel 60x72 (Curtain Wall)',15.0000,24.0000,0.0000,'Each',625.0000,0.00,9375.00,60.000,72.000,30.0000,6,'open',NULL,NULL,'igu_low_e','Low-E','6mm','Seamed','rectangular',NULL,0,0,NULL,NULL,NULL,NULL,'IGU: 6mm Low-E / 12mm Argon / 6mm Clear. Warm edge spacer.',NULL,'shipped',0),(5,6,1,NULL,'Tempered Glass Storefront Panel 48x72',8.0000,8.0000,0.0000,'Each',185.0000,0.00,1480.00,48.000,72.000,24.0000,7,'open',NULL,NULL,'tempered_panel','Clear Float','6mm','Flat Polish','rectangular',NULL,0,0,NULL,NULL,NULL,NULL,'Standard storefront panel - heat soak test required',NULL,'shipped',0),(6,6,2,NULL,'Tempered Glass Door Lite 24x60',4.0000,4.0000,0.0000,'Each',145.0000,0.00,580.00,24.000,60.000,10.0000,8,'open',NULL,NULL,'tempered_panel','Clear Float','10mm','Pencil Polish','rectangular',NULL,1,2,NULL,NULL,NULL,NULL,'Door lite with 2 hinge holes - tight tolerance',NULL,'shipped',0),(7,6,3,NULL,'Spandrel Glass Panel 48x48 (Black)',6.0000,16.0000,0.0000,'Each',210.0000,0.00,1260.00,48.000,48.000,16.0000,9,'open',NULL,NULL,'tempered_panel','Spandrel Black','6mm','Seamed','rectangular',NULL,0,0,NULL,NULL,NULL,NULL,'Black ceramic frit spandrel - tempered',NULL,'shipped',0),(8,7,1,2,'Tempered Glass Panel 24x36',10.0000,5.0000,0.0000,'Each',125.0000,0.00,1250.00,24.000,36.000,6.0000,NULL,'open',NULL,NULL,'tempered_panel','Clear Float','6mm','Flat Polish','rectangular',NULL,0,0,NULL,NULL,NULL,NULL,'Standard tempered panel - no special requirements',NULL,'shipped',0),(9,8,1,2,'Tempered Glass Storefront Panel 48x96',5.0000,0.0000,0.0000,'Each',185.0000,0.00,925.00,NULL,NULL,NULL,10,'open',NULL,NULL,'tempered_panel','Clear Float','8mm',NULL,'rectangular',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'released',0),(12,11,1,8,'Laminated Safety Glass Panel 1200x2400mm',5.0000,0.0000,0.0000,'Each',450.0000,0.00,2250.00,47.240,94.490,30.9980,12,'open','2026-07-15',NULL,NULL,NULL,NULL,NULL,'rectangular',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'released',0),(13,12,1,2,'Tempered Glass Panel 24x36',10.0000,0.0000,0.0000,'Each',150.0000,0.00,1500.00,24.000,36.000,6.0000,15,'open','2026-07-15',NULL,NULL,'Clear Float',NULL,NULL,'rectangular',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'released',0),(14,13,1,8,'Laminated Safety Glass Panel 48x72',3.0000,0.0000,0.0000,'Each',450.0000,0.00,1350.00,48.000,72.000,24.0000,20,'open','2026-07-20',NULL,NULL,'Clear Float',NULL,NULL,'rectangular',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'released',0),(15,14,1,2,NULL,5.0000,0.0000,0.0000,'Each',95.0000,0.00,475.00,NULL,NULL,NULL,19,'open','2026-07-15',NULL,NULL,'tempered','6mm',NULL,'rectangular',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'released',0),(16,15,1,2,'Test Tempered Panel',3.0000,0.0000,0.0000,'Each',150.0000,0.00,450.00,NULL,NULL,NULL,23,'open','2026-07-15',NULL,NULL,NULL,NULL,NULL,'rectangular',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'released',0),(17,16,1,2,'Test Tempered Panel',3.0000,0.0000,0.0000,'Each',150.0000,0.00,450.00,NULL,NULL,NULL,24,'open','2026-07-15',NULL,NULL,NULL,NULL,NULL,'rectangular',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'released',0),(18,17,1,2,'Test Tempered Panel',3.0000,0.0000,0.0000,'Each',150.0000,0.00,450.00,NULL,NULL,NULL,25,'open','2026-07-15',NULL,NULL,NULL,NULL,NULL,'rectangular',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'released',0),(19,18,1,2,'Test Tempered Panel',3.0000,0.0000,0.0000,'Each',150.0000,0.00,450.00,NULL,NULL,NULL,26,'open','2026-07-15',NULL,NULL,NULL,NULL,NULL,'rectangular',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'released',0),(20,19,1,2,'Test Tempered Panel',3.0000,0.0000,0.0000,'Each',150.0000,0.00,450.00,NULL,NULL,NULL,27,'open','2026-07-15',NULL,NULL,NULL,NULL,NULL,'rectangular',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'released',0);
/*!40000 ALTER TABLE `sales_order_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_orders`
--

DROP TABLE IF EXISTS `sales_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(20) NOT NULL,
  `customer_id` int NOT NULL,
  `customer_po` varchar(50) DEFAULT NULL,
  `project_name` varchar(100) DEFAULT NULL,
  `order_date` date NOT NULL,
  `required_date` date DEFAULT NULL,
  `promised_date` date DEFAULT NULL,
  `ship_date` date DEFAULT NULL,
  `status` enum('draft','pending_approval','open','partial','shipped','invoiced','complete','closed','cancelled') DEFAULT 'draft',
  `quote_id` int DEFAULT NULL,
  `salesperson_id` int DEFAULT NULL,
  `carrier_id` int DEFAULT NULL,
  `ship_via` varchar(50) DEFAULT NULL,
  `fob` varchar(50) DEFAULT NULL,
  `ship_to_name` varchar(100) DEFAULT NULL,
  `ship_address1` varchar(100) DEFAULT NULL,
  `ship_address2` varchar(100) DEFAULT NULL,
  `ship_city` varchar(50) DEFAULT NULL,
  `ship_state` varchar(50) DEFAULT NULL,
  `ship_zip` varchar(20) DEFAULT NULL,
  `subtotal` decimal(12,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) DEFAULT '0.00',
  `freight_amount` decimal(12,2) DEFAULT '0.00',
  `discount_amount` decimal(12,2) DEFAULT '0.00',
  `total` decimal(12,2) DEFAULT '0.00',
  `deposit_amount` decimal(12,2) DEFAULT '0.00',
  `notes` text,
  `internal_notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `cancelled_by` int DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `payment_terms` varchar(50) DEFAULT 'Net 30',
  `currency_code` varchar(3) DEFAULT 'USD',
  `exchange_rate` decimal(12,6) DEFAULT '1.000000',
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `customer_id` (`customer_id`),
  KEY `quote_id` (`quote_id`),
  KEY `salesperson_id` (`salesperson_id`),
  KEY `carrier_id` (`carrier_id`),
  KEY `idx_so_status` (`status`),
  CONSTRAINT `sales_orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `sales_orders_ibfk_2` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`),
  CONSTRAINT `sales_orders_ibfk_3` FOREIGN KEY (`salesperson_id`) REFERENCES `salespeople` (`id`),
  CONSTRAINT `sales_orders_ibfk_4` FOREIGN KEY (`carrier_id`) REFERENCES `carriers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_orders`
--

LOCK TABLES `sales_orders` WRITE;
/*!40000 ALTER TABLE `sales_orders` DISABLE KEYS */;
INSERT INTO `sales_orders` VALUES (1,'SO-10001',1,NULL,NULL,'2026-06-25','2026-07-10',NULL,NULL,'shipped',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,449.95,0.00,0.00,0.00,449.95,0.00,'First test order',NULL,1,'2026-06-25 23:38:17','2026-06-27 13:26:06',NULL,NULL,'Net 30','USD',1.000000),(2,'SO-10002',1,NULL,NULL,'2026-06-26',NULL,NULL,NULL,'open',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1250.00,0.00,0.00,0.00,1250.00,0.00,NULL,NULL,1,'2026-06-26 00:10:52','2026-06-26 00:10:52',NULL,NULL,'Net 30','USD',1.000000),(3,'SO-10003',1,NULL,NULL,'2026-06-26',NULL,NULL,NULL,'invoiced',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1250.00,0.00,0.00,0.00,1250.00,1000.00,NULL,NULL,1,'2026-06-26 00:11:12','2026-06-26 00:20:04',NULL,NULL,'Net 30','USD',1.000000),(4,'SO-10004',1,'PO-2026-0451','Downtown Office Tower - Level 3 Balustrade','2026-06-26','2026-07-17',NULL,NULL,'open',4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,18750.00,0.00,0.00,0.00,18750.00,0.00,NULL,NULL,1,'2026-06-26 02:13:33','2026-06-26 02:13:33',NULL,NULL,'Net 30','USD',1.000000),(5,'SO-10005',1,'PO-2026-0451','Downtown Office Tower - Level 3 Balustrade','2026-06-26','2026-07-17',NULL,NULL,'shipped',4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,18750.00,0.00,0.00,0.00,18750.00,0.00,NULL,NULL,1,'2026-06-26 02:14:01','2026-06-26 23:14:12',NULL,NULL,'Net 30','USD',1.000000),(6,'SO-10006',2,NULL,NULL,'2026-06-26','2026-07-17',NULL,NULL,'shipped',2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1250.00,0.00,0.00,0.00,3320.00,0.00,NULL,NULL,1,'2026-06-26 02:31:11','2026-06-26 02:33:27',NULL,NULL,'Net 30','USD',1.000000),(7,'SO-10007',2,'PO-TEST-001',NULL,'2026-06-26','2026-07-17',NULL,NULL,'open',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1250.00,0.00,0.00,0.00,1250.00,0.00,NULL,NULL,1,'2026-06-26 23:06:02','2026-06-26 23:06:02',NULL,NULL,'Net 30','USD',1.000000),(8,'SO-10008',2,'PO-STORE-2026','Test Storefront Project','2026-06-26','2026-07-17',NULL,NULL,'open',6,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,925.00,0.00,0.00,0.00,925.00,500.00,NULL,NULL,1,'2026-06-26 23:36:56','2026-06-26 23:50:09',NULL,NULL,'Net 30','USD',1.000000),(9,'SO-10009',1,NULL,NULL,'2026-06-27','2026-07-15',NULL,NULL,'open',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,2250.00,0.00,0.00,0.00,2250.00,0.00,'Test laminated glass order',NULL,1,'2026-06-27 12:30:17','2026-06-27 12:30:17',NULL,NULL,'Net 30','USD',1.000000),(10,'SO-10010',1,NULL,NULL,'2026-06-27','2026-07-15',NULL,NULL,'open',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,2250.00,0.00,0.00,0.00,2250.00,0.00,'Test laminated glass order',NULL,1,'2026-06-27 12:30:25','2026-06-27 12:30:25',NULL,NULL,'Net 30','USD',1.000000),(11,'SO-10011',1,NULL,NULL,'2026-06-27','2026-07-15',NULL,NULL,'open',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,2250.00,0.00,0.00,0.00,2250.00,0.00,'Test laminated glass order',NULL,1,'2026-06-27 12:31:07','2026-06-27 12:31:07',NULL,NULL,'Net 30','USD',1.000000),(12,'SO-10012',1,NULL,NULL,'2026-06-27','2026-07-15',NULL,NULL,'open',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1500.00,0.00,0.00,0.00,1500.00,0.00,NULL,NULL,1,'2026-06-27 12:46:21','2026-06-27 12:46:21',NULL,NULL,'Net 30','USD',1.000000),(13,'SO-10013',1,NULL,NULL,'2026-06-27','2026-07-20',NULL,NULL,'open',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1350.00,0.00,0.00,0.00,1350.00,0.00,NULL,NULL,1,'2026-06-27 12:47:08','2026-06-27 12:47:08',NULL,NULL,'Net 30','USD',1.000000),(14,'SO-10014',1,NULL,NULL,'2026-06-27','2026-07-15',NULL,NULL,'open',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,475.00,0.00,0.00,0.00,475.00,0.00,NULL,NULL,1,'2026-06-27 13:14:40','2026-06-27 13:14:40',NULL,NULL,'Net 30','USD',1.000000),(15,'SO-10015',1,NULL,NULL,'2026-06-27','2026-07-15',NULL,NULL,'open',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,450.00,0.00,0.00,0.00,450.00,0.00,NULL,NULL,1,'2026-06-27 13:39:25','2026-06-27 13:39:25',NULL,NULL,'Net 30','USD',1.000000),(16,'SO-10016',1,NULL,NULL,'2026-06-27','2026-07-15',NULL,NULL,'open',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,450.00,0.00,0.00,0.00,450.00,0.00,NULL,NULL,1,'2026-06-27 13:40:17','2026-06-27 13:40:17',NULL,NULL,'Net 30','USD',1.000000),(17,'SO-10017',1,NULL,NULL,'2026-06-27','2026-07-15',NULL,NULL,'open',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,450.00,0.00,0.00,0.00,450.00,0.00,NULL,NULL,1,'2026-06-27 14:02:40','2026-06-27 14:02:40',NULL,NULL,'Net 30','USD',1.000000),(18,'SO-10018',1,NULL,NULL,'2026-06-27','2026-07-15',NULL,NULL,'open',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,450.00,0.00,0.00,0.00,450.00,0.00,NULL,NULL,1,'2026-06-27 14:14:10','2026-06-27 14:14:10',NULL,NULL,'Net 30','USD',1.000000),(19,'SO-10019',1,NULL,NULL,'2026-06-27','2026-07-15',NULL,NULL,'open',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,450.00,0.00,0.00,0.00,450.00,0.00,NULL,NULL,1,'2026-06-27 14:32:06','2026-06-27 14:32:06',NULL,NULL,'Net 30','USD',1.000000);
/*!40000 ALTER TABLE `sales_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salespeople`
--

DROP TABLE IF EXISTS `salespeople`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salespeople` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `commission_rate` decimal(5,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salespeople`
--

LOCK TABLES `salespeople` WRITE;
/*!40000 ALTER TABLE `salespeople` DISABLE KEYS */;
/*!40000 ALTER TABLE `salespeople` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_entries`
--

DROP TABLE IF EXISTS `schedule_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int DEFAULT NULL,
  `work_center_id` int DEFAULT NULL,
  `operation_name` varchar(255) DEFAULT NULL,
  `planned_start` datetime DEFAULT NULL,
  `planned_end` datetime DEFAULT NULL,
  `actual_start` datetime DEFAULT NULL,
  `actual_end` datetime DEFAULT NULL,
  `status` enum('scheduled','in-progress','completed','delayed','cancelled') DEFAULT 'scheduled',
  `priority` int DEFAULT '5',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_entries`
--

LOCK TABLES `schedule_entries` WRITE;
/*!40000 ALTER TABLE `schedule_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `schedule_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scrap_codes`
--

DROP TABLE IF EXISTS `scrap_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scrap_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scrap_codes`
--

LOCK TABLES `scrap_codes` WRITE;
/*!40000 ALTER TABLE `scrap_codes` DISABLE KEYS */;
INSERT INTO `scrap_codes` VALUES (1,'BREAK','Glass breakage during handling',1),(2,'CHIP','Edge chip during processing',1),(3,'SCRATCH','Surface scratch detected in QC',1),(4,'TEMPER','Tempering failure',1),(5,'CUT-ERR','Cutting error - wrong dimensions',1),(6,'DRILL-ERR','Drilling error - wrong position',1),(7,'EDGE-ERR','Edge processing error',1),(8,'LAMI-ERR','Lamination defect',1),(9,'INCL','Inclusion or contamination',1),(10,'WARP','Warping during tempering',1),(11,'OTHER','Other - see notes',1);
/*!40000 ALTER TABLE `scrap_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sequences`
--

DROP TABLE IF EXISTS `sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sequences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `seq_name` varchar(50) NOT NULL,
  `prefix` varchar(10) DEFAULT '',
  `current_value` int DEFAULT '0',
  `increment_by` int DEFAULT '1',
  `pad_length` int DEFAULT '5',
  PRIMARY KEY (`id`),
  UNIQUE KEY `seq_name` (`seq_name`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sequences`
--

LOCK TABLES `sequences` WRITE;
/*!40000 ALTER TABLE `sequences` DISABLE KEYS */;
INSERT INTO `sequences` VALUES (1,'quote','QT-',1005,1,5),(2,'sales_order','SO-',10019,1,5),(3,'shipment','SH-',1011,1,5),(4,'work_order','WO-',20035,1,5),(5,'purchase_order','PO-',5003,1,5),(6,'ar_invoice','INV-',10012,1,5),(7,'ap_invoice','AP-',1002,1,5),(8,'customer','C-',10002,1,5),(9,'vendor','V-',1003,1,5),(10,'receipt','REC-',1000,1,5),(11,'payment','PMT-',1013,1,5),(12,'journal','JV-',1000,1,5),(13,'adjustment','ADJ-',1002,1,5),(14,'wo_receipt','WOR-',1003,1,5),(15,'po_receipt','POR-',1010,1,5),(16,'journal_voucher','JV-',1003,1,5),(17,'credit_memo','CM-',1003,1,4),(18,'deposit','DEP-',1002,1,4),(19,'debit_memo','DM-',1000,1,4),(20,'ncr','NCR-',1000,1,4),(21,'vendor_payment','VP-',1006,1,4),(23,'transfer','TRF-',1000,1,5),(25,'physical_count','PC-',1002,1,5);
/*!40000 ALTER TABLE `sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `serial_numbers`
--

DROP TABLE IF EXISTS `serial_numbers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `serial_numbers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `serial_number` varchar(100) NOT NULL,
  `item_id` int NOT NULL,
  `lot_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `status` enum('available','issued','sold','scrapped','in_service','reserved') DEFAULT 'available',
  `received_date` date DEFAULT NULL,
  `sold_date` date DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `sales_order_id` int DEFAULT NULL,
  `work_order_id` int DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `serial_number` (`serial_number`),
  KEY `item_id` (`item_id`),
  KEY `lot_id` (`lot_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `serial_numbers_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `serial_numbers_ibfk_2` FOREIGN KEY (`lot_id`) REFERENCES `lots` (`id`),
  CONSTRAINT `serial_numbers_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `serial_numbers`
--

LOCK TABLES `serial_numbers` WRITE;
/*!40000 ALTER TABLE `serial_numbers` DISABLE KEYS */;
/*!40000 ALTER TABLE `serial_numbers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sg_config`
--

DROP TABLE IF EXISTS `sg_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sg_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) DEFAULT NULL,
  `setting_value` text,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sg_config`
--

LOCK TABLES `sg_config` WRITE;
/*!40000 ALTER TABLE `sg_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `sg_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sg_integration_config`
--

DROP TABLE IF EXISTS `sg_integration_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sg_integration_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `api_url` varchar(255) DEFAULT 'https://api.smartglazier.com',
  `api_key` varchar(255) DEFAULT NULL,
  `api_secret` varchar(255) DEFAULT NULL,
  `company_id` varchar(100) DEFAULT NULL,
  `sync_enabled` tinyint(1) DEFAULT '0',
  `sync_interval_minutes` int DEFAULT '15',
  `last_sync_at` datetime DEFAULT NULL,
  `last_sync_status` enum('success','failed','running') DEFAULT NULL,
  `last_sync_message` text,
  `auto_create_so` tinyint(1) DEFAULT '1',
  `auto_create_wo` tinyint(1) DEFAULT '0',
  `default_payment_terms` varchar(50) DEFAULT 'Net 30',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sg_integration_config`
--

LOCK TABLES `sg_integration_config` WRITE;
/*!40000 ALTER TABLE `sg_integration_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `sg_integration_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sg_order_items`
--

DROP TABLE IF EXISTS `sg_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sg_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sg_order_id` int DEFAULT NULL,
  `product_type` varchar(100) DEFAULT NULL,
  `width` decimal(10,2) DEFAULT NULL,
  `height` decimal(10,2) DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `glass_type` varchar(100) DEFAULT NULL,
  `thickness` varchar(50) DEFAULT NULL,
  `edge_work` varchar(100) DEFAULT NULL,
  `coatings` varchar(255) DEFAULT NULL,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `notes` text,
  `dxf_file_url` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sg_order_items`
--

LOCK TABLES `sg_order_items` WRITE;
/*!40000 ALTER TABLE `sg_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `sg_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sg_order_lines`
--

DROP TABLE IF EXISTS `sg_order_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sg_order_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sg_order_id` int NOT NULL,
  `sg_line_id` varchar(100) DEFAULT NULL,
  `product_type` varchar(100) DEFAULT NULL,
  `description` text,
  `width` decimal(10,2) DEFAULT NULL,
  `height` decimal(10,2) DEFAULT NULL,
  `thickness` decimal(10,2) DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `unit_price` decimal(12,2) DEFAULT NULL,
  `total_price` decimal(12,2) DEFAULT NULL,
  `glass_type` varchar(100) DEFAULT NULL,
  `edge_work` varchar(100) DEFAULT NULL,
  `cutouts` text,
  `hardware` json DEFAULT NULL,
  `dxf_file_url` varchar(500) DEFAULT NULL,
  `local_item_id` int DEFAULT NULL,
  `local_so_line_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sg_order_id` (`sg_order_id`),
  KEY `local_item_id` (`local_item_id`),
  CONSTRAINT `sg_order_lines_ibfk_1` FOREIGN KEY (`sg_order_id`) REFERENCES `sg_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sg_order_lines_ibfk_2` FOREIGN KEY (`local_item_id`) REFERENCES `items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sg_order_lines`
--

LOCK TABLES `sg_order_lines` WRITE;
/*!40000 ALTER TABLE `sg_order_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `sg_order_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sg_orders`
--

DROP TABLE IF EXISTS `sg_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sg_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sg_order_id` varchar(100) NOT NULL,
  `sg_order_number` varchar(50) DEFAULT NULL,
  `sg_customer_id` varchar(100) DEFAULT NULL,
  `sg_customer_name` varchar(200) DEFAULT NULL,
  `sg_customer_email` varchar(200) DEFAULT NULL,
  `sg_order_date` datetime DEFAULT NULL,
  `sg_status` varchar(50) DEFAULT NULL,
  `sg_total` decimal(12,2) DEFAULT NULL,
  `sg_currency` varchar(10) DEFAULT 'USD',
  `sg_raw_data` json DEFAULT NULL,
  `local_customer_id` int DEFAULT NULL,
  `local_sales_order_id` int DEFAULT NULL,
  `local_work_order_id` int DEFAULT NULL,
  `sync_status` enum('pending','synced','error','ignored') DEFAULT 'pending',
  `sync_error` text,
  `synced_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sg_order_id` (`sg_order_id`),
  KEY `local_customer_id` (`local_customer_id`),
  KEY `local_sales_order_id` (`local_sales_order_id`),
  CONSTRAINT `sg_orders_ibfk_1` FOREIGN KEY (`local_customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sg_orders_ibfk_2` FOREIGN KEY (`local_sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sg_orders`
--

LOCK TABLES `sg_orders` WRITE;
/*!40000 ALTER TABLE `sg_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `sg_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sg_sync_log`
--

DROP TABLE IF EXISTS `sg_sync_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sg_sync_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sync_type` enum('orders','customers','products','status_push') NOT NULL,
  `direction` enum('pull','push') NOT NULL,
  `records_processed` int DEFAULT '0',
  `records_created` int DEFAULT '0',
  `records_updated` int DEFAULT '0',
  `records_failed` int DEFAULT '0',
  `status` enum('success','partial','failed') NOT NULL,
  `error_details` text,
  `started_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sg_sync_log`
--

LOCK TABLES `sg_sync_log` WRITE;
/*!40000 ALTER TABLE `sg_sync_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `sg_sync_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sheet_stock`
--

DROP TABLE IF EXISTS `sheet_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sheet_stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `glass_type` varchar(50) NOT NULL DEFAULT 'Clear',
  `thickness` varchar(20) NOT NULL DEFAULT '6mm',
  `width` decimal(10,4) NOT NULL COMMENT 'inches',
  `height` decimal(10,4) NOT NULL COMMENT 'inches',
  `qty_on_hand` int NOT NULL DEFAULT '0',
  `cost_per_sheet` decimal(10,2) DEFAULT '0.00',
  `location` varchar(100) DEFAULT 'Main Warehouse',
  `supplier` varchar(200) DEFAULT NULL,
  `min_qty` int DEFAULT '0',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sheet_stock`
--

LOCK TABLES `sheet_stock` WRITE;
/*!40000 ALTER TABLE `sheet_stock` DISABLE KEYS */;
INSERT INTO `sheet_stock` VALUES (1,'Clear','6mm',93.0000,130.0000,15,185.00,'Main Warehouse','Guardian Glass Supply',0,NULL,'2026-06-26 14:12:04','2026-06-26 14:12:04'),(2,'Clear','10mm',93.0000,130.0000,8,275.00,'Main Warehouse','Guardian Glass Supply',0,NULL,'2026-06-26 14:12:04','2026-06-26 14:12:04'),(3,'Low-E','6mm',96.0000,130.0000,5,320.00,'Main Warehouse','Guardian Glass Supply',0,NULL,'2026-06-26 14:12:04','2026-06-26 14:12:04'),(4,'Spandrel Black','6mm',72.0000,96.0000,4,210.00,'Main Warehouse','PPG Industries',0,NULL,'2026-06-26 14:12:04','2026-06-26 14:12:04'),(5,'Clear','6mm',72.0000,96.0000,10,125.00,'Main Warehouse','Guardian Glass Supply',0,NULL,'2026-06-26 14:12:04','2026-06-26 14:12:04'),(6,'Clear','8mm',93.0000,130.0000,6,225.00,'Main Warehouse','Guardian Glass Supply',0,NULL,'2026-06-26 14:12:04','2026-06-26 14:12:04');
/*!40000 ALTER TABLE `sheet_stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipment_lines`
--

DROP TABLE IF EXISTS `shipment_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipment_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shipment_id` int NOT NULL,
  `sales_order_line_id` int NOT NULL,
  `item_id` int DEFAULT NULL,
  `quantity_shipped` decimal(12,4) NOT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `rack_position` varchar(20) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_order_line_id` (`sales_order_line_id`),
  KEY `item_id` (`item_id`),
  KEY `idx_sl_shipment` (`shipment_id`),
  CONSTRAINT `shipment_lines_ibfk_1` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shipment_lines_ibfk_2` FOREIGN KEY (`sales_order_line_id`) REFERENCES `sales_order_lines` (`id`),
  CONSTRAINT `shipment_lines_ibfk_3` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipment_lines`
--

LOCK TABLES `shipment_lines` WRITE;
/*!40000 ALTER TABLE `shipment_lines` DISABLE KEYS */;
INSERT INTO `shipment_lines` VALUES (1,2,1,2,5.0000,NULL,NULL,NULL,NULL),(2,3,1,2,10.0000,NULL,NULL,NULL,NULL),(3,5,5,NULL,8.0000,NULL,NULL,NULL,'Tempered Glass Storefront Panel 48x72'),(4,5,6,NULL,4.0000,NULL,NULL,NULL,'Tempered Glass Door Lite 24x60'),(5,5,7,NULL,6.0000,NULL,NULL,NULL,'Spandrel Glass Panel 48x48 (Black)'),(6,6,7,NULL,10.0000,NULL,NULL,NULL,'Test'),(7,6,8,NULL,5.0000,NULL,NULL,NULL,'Test2'),(9,7,2,NULL,10.0000,NULL,NULL,NULL,'Tempered Laminated Glass Panel 48x42'),(10,7,3,NULL,5.0000,NULL,NULL,NULL,'Tempered Laminated Glass Panel 36x42'),(11,7,4,NULL,8.0000,NULL,NULL,NULL,'IGU Low-E Panel 60x72'),(12,8,2,NULL,10.0000,NULL,NULL,NULL,'Tempered Laminated Glass Panel 48x42'),(13,8,3,NULL,5.0000,NULL,NULL,NULL,'Tempered Laminated Glass Panel 36x42 (End Panel)'),(14,8,4,NULL,8.0000,NULL,NULL,NULL,'IGU Low-E Panel 60x72 (Curtain Wall)'),(15,9,2,NULL,10.0000,NULL,NULL,NULL,'Tempered Laminated Glass Panel 48x42'),(16,9,3,NULL,5.0000,NULL,NULL,NULL,'Tempered Laminated Glass Panel 36x42 (End Panel)'),(17,9,4,NULL,8.0000,NULL,NULL,NULL,'IGU Low-E Panel 60x72 (Curtain Wall)'),(18,10,1,2,2.0000,NULL,NULL,NULL,NULL),(19,11,1,2,1.0000,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `shipment_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipments`
--

DROP TABLE IF EXISTS `shipments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shipment_number` varchar(20) NOT NULL,
  `sales_order_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `shipment_date` date NOT NULL,
  `carrier_id` int DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `weight` decimal(10,2) DEFAULT NULL,
  `freight_charge` decimal(10,2) DEFAULT '0.00',
  `status` enum('draft','shipped','delivered','cancelled') DEFAULT 'draft',
  `ship_to_name` varchar(100) DEFAULT NULL,
  `ship_address1` varchar(100) DEFAULT NULL,
  `ship_address2` varchar(100) DEFAULT NULL,
  `ship_city` varchar(50) DEFAULT NULL,
  `ship_state` varchar(50) DEFAULT NULL,
  `ship_zip` varchar(20) DEFAULT NULL,
  `notes` text,
  `rack_number` varchar(50) DEFAULT NULL,
  `total_panels` int DEFAULT '0',
  `delivery_instructions` text,
  `delivered_at` datetime DEFAULT NULL,
  `delivery_confirmed_by` int DEFAULT NULL,
  `invoice_id` int DEFAULT NULL,
  `shipped_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shipment_number` (`shipment_number`),
  KEY `sales_order_id` (`sales_order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `carrier_id` (`carrier_id`),
  CONSTRAINT `shipments_ibfk_1` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `shipments_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `shipments_ibfk_3` FOREIGN KEY (`carrier_id`) REFERENCES `carriers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipments`
--

LOCK TABLES `shipments` WRITE;
/*!40000 ALTER TABLE `shipments` DISABLE KEYS */;
INSERT INTO `shipments` VALUES (1,'SH-01001',1,1,'2026-06-25',NULL,'FX123456789',NULL,0.00,'shipped',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,1,'2026-06-25 23:41:21'),(2,'SH-01002',1,1,'2026-06-25',NULL,'FX123456789',NULL,0.00,'shipped',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,1,'2026-06-25 23:42:46'),(3,'SH-01003',1,1,'2026-06-26',NULL,'1Z999AA10123456784',NULL,0.00,'shipped',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,1,'2026-06-26 00:11:12'),(4,'SH-01004',6,2,'2026-06-26',NULL,'TRK-2026-8891',NULL,0.00,'shipped',NULL,NULL,NULL,NULL,NULL,NULL,'',NULL,18,NULL,NULL,NULL,6,1,'2026-06-26 02:33:04'),(5,'SH-01005',6,2,'2026-06-26',NULL,'TRK-2026-8891',NULL,0.00,'shipped',NULL,NULL,NULL,NULL,NULL,NULL,'',NULL,18,NULL,NULL,NULL,4,1,'2026-06-26 02:33:27'),(6,'SH-01006',5,1,'2026-06-26',NULL,'TRK-789456123',NULL,0.00,'shipped',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,23,NULL,NULL,NULL,NULL,1,'2026-06-26 23:10:30'),(7,'SH-01007',5,1,'2026-06-26',NULL,'TRK-789456123',NULL,0.00,'shipped',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,23,NULL,NULL,NULL,NULL,1,'2026-06-26 23:10:47'),(8,'SH-01008',5,1,'2026-06-26',NULL,'TRK-789456123',NULL,0.00,'shipped',NULL,NULL,NULL,NULL,NULL,NULL,'',NULL,23,NULL,NULL,NULL,NULL,1,'2026-06-26 23:13:02'),(9,'SH-01009',5,1,'2026-06-26',NULL,'TRK-789456123',NULL,0.00,'shipped',NULL,NULL,NULL,NULL,NULL,NULL,'',NULL,23,NULL,NULL,NULL,NULL,1,'2026-06-26 23:14:12'),(10,'SH-01010',1,1,'2026-06-27',NULL,NULL,NULL,0.00,'shipped',NULL,NULL,NULL,NULL,NULL,NULL,'Phase 2 COGS test',NULL,2,NULL,NULL,NULL,NULL,1,'2026-06-27 13:26:06'),(11,'SH-01011',1,1,'2026-06-27',NULL,NULL,NULL,0.00,'shipped',NULL,NULL,NULL,NULL,NULL,NULL,'Phase 2 COGS corrected test',NULL,1,NULL,NULL,NULL,NULL,1,'2026-06-27 13:26:51');
/*!40000 ALTER TABLE `shipments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_floor_tracking`
--

DROP TABLE IF EXISTS `shop_floor_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_floor_tracking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `wo_routing_id` int DEFAULT NULL,
  `work_center_id` int NOT NULL,
  `status` enum('queued','in_progress','complete','completed','on_hold','recut') DEFAULT 'queued',
  `operator_name` varchar(100) DEFAULT NULL,
  `operator_id` int DEFAULT NULL,
  `quantity_in` decimal(12,4) DEFAULT '0.0000',
  `quantity_out` decimal(12,4) DEFAULT '0.0000',
  `quantity_scrapped` decimal(12,4) DEFAULT '0.0000',
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `quantity_good` decimal(12,4) DEFAULT '0.0000',
  `quantity_scrap` decimal(12,4) DEFAULT '0.0000',
  `scrap_code` varchar(20) DEFAULT NULL,
  `scrap_reason` text,
  `label_printed` tinyint(1) DEFAULT '0',
  `label_printed_at` datetime DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `wo_routing_id` (`wo_routing_id`),
  KEY `work_center_id` (`work_center_id`),
  CONSTRAINT `shop_floor_tracking_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `shop_floor_tracking_ibfk_2` FOREIGN KEY (`wo_routing_id`) REFERENCES `wo_routing` (`id`),
  CONSTRAINT `shop_floor_tracking_ibfk_3` FOREIGN KEY (`work_center_id`) REFERENCES `work_centers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=114 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_floor_tracking`
--

LOCK TABLES `shop_floor_tracking` WRITE;
/*!40000 ALTER TABLE `shop_floor_tracking` DISABLE KEYS */;
INSERT INTO `shop_floor_tracking` VALUES (1,2,7,1,'in_progress','Operator',1,100.0000,0.0000,0.0000,'2026-06-26 01:36:01',NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(2,4,NULL,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(3,4,NULL,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(4,4,NULL,3,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(5,4,NULL,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(6,4,NULL,6,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(7,4,NULL,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(8,4,NULL,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(9,4,NULL,7,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(10,4,NULL,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(11,4,NULL,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(12,5,NULL,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(13,5,NULL,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(14,5,NULL,3,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(15,5,NULL,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(16,5,NULL,6,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(17,5,NULL,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(18,5,NULL,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(19,5,NULL,7,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(20,5,NULL,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(21,5,NULL,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(22,7,NULL,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(23,7,NULL,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(24,7,NULL,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(25,7,NULL,6,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(26,7,NULL,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(27,7,NULL,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(28,8,NULL,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(29,8,NULL,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(30,8,NULL,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(31,8,NULL,6,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(32,8,NULL,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(33,8,NULL,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(34,9,NULL,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(35,9,NULL,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(36,9,NULL,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(37,9,NULL,6,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(38,9,NULL,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(39,9,NULL,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(40,1,4,6,'in_progress','Operator',1,10.0000,0.0000,0.0000,'2026-06-26 12:04:29',NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(41,2,8,2,'in_progress','Operator',1,100.0000,0.0000,0.0000,'2026-06-26 16:09:07',NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(42,10,NULL,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(43,10,NULL,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(44,10,NULL,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(45,10,NULL,6,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(46,10,NULL,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(47,10,NULL,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,NULL),(54,12,13,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Cut glass lites to size'),(55,12,14,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Edge processing - seamed or polished'),(56,12,15,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Wash and dry before lamination'),(57,12,16,7,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Laminate with PVB/SGP interlayer in autoclave'),(58,12,17,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Quality inspection - delamination check'),(59,12,18,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Pack for shipment'),(60,15,23,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Cut glass to size per drawing'),(61,15,24,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Edge processing per spec'),(62,15,25,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Wash and dry before tempering'),(63,15,26,6,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Temper in furnace per glass spec'),(64,15,27,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Quality inspection - visual and stress test'),(65,15,28,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Pack for shipment or storage'),(66,16,29,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Cut glass lites to size'),(67,16,30,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Edge processing - seamed or polished'),(68,16,31,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Wash and dry before lamination'),(69,16,32,7,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Laminate with PVB/SGP interlayer in autoclave'),(70,16,33,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Quality inspection - delamination check'),(71,16,34,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Pack for shipment'),(72,19,39,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Cut glass to size per drawing'),(73,19,40,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Edge processing per spec'),(74,19,41,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Wash and dry before tempering'),(75,19,42,6,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Temper in furnace per glass spec'),(76,19,43,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Quality inspection - visual and stress test'),(77,19,44,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Pack for shipment or storage'),(78,20,45,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Cut glass lites to size'),(79,20,46,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Edge processing - seamed or polished'),(80,20,47,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Wash and dry before lamination'),(81,20,48,7,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Laminate with PVB/SGP interlayer in autoclave'),(82,20,49,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Quality inspection - delamination check'),(83,20,50,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Pack for shipment'),(84,23,55,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Cut glass to size per drawing'),(85,23,56,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Edge processing per spec'),(86,23,57,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Wash and dry before tempering'),(87,23,58,6,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Temper in furnace per glass spec'),(88,23,59,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Quality inspection - visual and stress test'),(89,23,60,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Pack for shipment or storage'),(90,24,61,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Cut glass to size per drawing'),(91,24,62,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Edge processing per spec'),(92,24,63,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Wash and dry before tempering'),(93,24,64,6,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Temper in furnace per glass spec'),(94,24,65,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Quality inspection - visual and stress test'),(95,24,66,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Pack for shipment or storage'),(96,25,67,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Cut glass to size per drawing'),(97,25,68,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Edge processing per spec'),(98,25,69,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Wash and dry before tempering'),(99,25,70,6,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Temper in furnace per glass spec'),(100,25,71,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Quality inspection - visual and stress test'),(101,25,72,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Pack for shipment or storage'),(102,26,73,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Cut glass to size per drawing'),(103,26,74,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Edge processing per spec'),(104,26,75,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Wash and dry before tempering'),(105,26,76,6,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Temper in furnace per glass spec'),(106,26,77,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Quality inspection - visual and stress test'),(107,26,78,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Pack for shipment or storage'),(108,27,79,1,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Cut glass to size per drawing'),(109,27,80,2,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Edge processing per spec'),(110,27,81,5,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Wash and dry before tempering'),(111,27,82,6,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Temper in furnace per glass spec'),(112,27,83,8,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Quality inspection - visual and stress test'),(113,27,84,9,'queued',NULL,NULL,0.0000,0.0000,0.0000,NULL,NULL,0.0000,0.0000,NULL,NULL,0,NULL,'Pack for shipment or storage');
/*!40000 ALTER TABLE `shop_floor_tracking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `so_line_fabrication`
--

DROP TABLE IF EXISTS `so_line_fabrication`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `so_line_fabrication` (
  `id` int NOT NULL AUTO_INCREMENT,
  `so_line_id` int NOT NULL,
  `fabrication_charge_id` int NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '1.00',
  `rate` decimal(10,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(255) DEFAULT '',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fabrication_charge_id` (`fabrication_charge_id`),
  CONSTRAINT `so_line_fabrication_ibfk_1` FOREIGN KEY (`fabrication_charge_id`) REFERENCES `fabrication_charges` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `so_line_fabrication`
--

LOCK TABLES `so_line_fabrication` WRITE;
/*!40000 ALTER TABLE `so_line_fabrication` DISABLE KEYS */;
/*!40000 ALTER TABLE `so_line_fabrication` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_transfers`
--

DROP TABLE IF EXISTS `stock_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_transfers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transfer_number` varchar(20) NOT NULL,
  `item_id` int NOT NULL,
  `from_location_id` int NOT NULL,
  `to_location_id` int NOT NULL,
  `quantity` decimal(12,4) NOT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `reason` varchar(100) DEFAULT NULL,
  `notes` text,
  `status` enum('pending','completed','cancelled') DEFAULT 'completed',
  `transferred_by` int DEFAULT NULL,
  `transfer_date` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transfer_number` (`transfer_number`),
  KEY `item_id` (`item_id`),
  KEY `from_location_id` (`from_location_id`),
  KEY `to_location_id` (`to_location_id`),
  CONSTRAINT `stock_transfers_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `stock_transfers_ibfk_2` FOREIGN KEY (`from_location_id`) REFERENCES `locations` (`id`),
  CONSTRAINT `stock_transfers_ibfk_3` FOREIGN KEY (`to_location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_transfers`
--

LOCK TABLES `stock_transfers` WRITE;
/*!40000 ALTER TABLE `stock_transfers` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `setting_type` enum('string','number','boolean','json') DEFAULT 'string',
  `category` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES (1,'email_host','','string','email','SMTP server hostname','2026-06-26 00:09:23'),(2,'email_port','587','number','email','SMTP server port','2026-06-26 00:09:23'),(3,'email_secure','false','boolean','email','Use TLS/SSL','2026-06-26 00:09:23'),(4,'email_user','','string','email','SMTP username/email','2026-06-26 00:09:23'),(5,'email_password','','string','email','SMTP password','2026-06-26 00:09:23'),(6,'email_from','','string','email','From email address','2026-06-26 00:09:23'),(7,'email_company_name','Max TA Group LLC','string','email','Company name in emails','2026-06-26 00:09:23'),(8,'company_phone','','string','company','Company phone number','2026-06-26 00:09:23'),(9,'company_address','','string','company','Company address','2026-06-26 00:09:23'),(10,'default_payment_terms','Net 30','string','sales','Default payment terms for new customers','2026-06-26 00:09:23'),(11,'tax_rate','0','number','sales','Default tax rate percentage','2026-06-26 00:09:23'),(12,'require_deposit','false','boolean','sales','Require deposit on new orders','2026-06-26 00:09:23'),(13,'deposit_percentage','50','number','sales','Default deposit percentage','2026-06-26 00:09:23'),(14,'gl_default_bank','1000','string','accounting','Default Bank/Cash GL Account','2026-06-26 18:07:32'),(15,'gl_default_ar','1100','string','accounting','Default Accounts Receivable GL Account','2026-06-26 18:07:32'),(16,'gl_default_ap','2000','string','accounting','Default Accounts Payable GL Account','2026-06-26 18:07:32'),(17,'gl_default_inventory_raw','1200','string','accounting','Default Raw Materials Inventory GL Account','2026-06-26 18:07:32'),(18,'gl_default_inventory_wip','1210','string','accounting','Default Work-in-Progress GL Account','2026-06-26 18:07:32'),(19,'gl_default_inventory_fg','1220','string','accounting','Default Finished Goods Inventory GL Account','2026-06-26 18:07:32'),(20,'gl_default_cogs','5000','string','accounting','Default Cost of Goods Sold GL Account','2026-06-26 18:07:32'),(21,'gl_default_sales_revenue','4000','string','accounting','Default Sales Revenue GL Account','2026-06-26 18:07:32'),(22,'gl_default_freight_revenue','4100','string','accounting','Default Freight Revenue GL Account','2026-06-26 18:07:32'),(23,'gl_default_direct_labor','5100','string','accounting','Default Direct Labor GL Account','2026-06-26 18:07:32'),(24,'gl_default_mfg_overhead','5200','string','accounting','Default Manufacturing Overhead GL Account','2026-06-26 18:07:32'),(25,'gl_default_material_variance','5010','string','accounting','Default Material Cost Variance GL Account','2026-06-26 18:07:32'),(26,'gl_default_labor_variance','5020','string','accounting','Default Labor Cost Variance GL Account','2026-06-26 18:07:32'),(27,'gl_default_ppv','5010','string','accounting','Default Purchase Price Variance GL Account','2026-06-26 18:07:32'),(28,'gl_default_retained_earnings','3100','string','accounting','Default Retained Earnings GL Account','2026-06-26 18:07:32'),(29,'gl_default_sales_tax','2200','string','accounting','Default Sales Tax Payable GL Account','2026-06-26 18:07:32'),(30,'inv_default_costing_method','standard','string','inventory','Default Costing Method (standard or average)','2026-06-26 18:07:32'),(31,'inv_auto_lot_control','false','boolean','inventory','Default lot control for new items','2026-06-26 18:07:32'),(32,'mfg_auto_backflush','true','boolean','manufacturing','Auto-issue materials on WO receipt (backflush)','2026-06-26 18:07:32'),(33,'mfg_track_wip','true','boolean','manufacturing','Track WIP costs through GL','2026-06-26 18:07:32'),(34,'mfg_auto_close_wo','true','boolean','manufacturing','Auto-close WO when fully received','2026-06-26 18:07:32');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_codes`
--

DROP TABLE IF EXISTS `tax_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(50) NOT NULL,
  `rate` decimal(6,4) NOT NULL DEFAULT '0.0000',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_codes`
--

LOCK TABLES `tax_codes` WRITE;
/*!40000 ALTER TABLE `tax_codes` DISABLE KEYS */;
INSERT INTO `tax_codes` VALUES (1,'EXEMPT','Tax Exempt',0.0000,1,'2026-06-26 03:52:53'),(2,'NY-STATE','NY State Tax',0.0400,1,'2026-06-26 03:52:53'),(3,'NY-CITY','NYC Tax',0.0450,1,'2026-06-26 03:52:53'),(4,'NY-COMBINED','NY Combined',0.0850,1,'2026-06-26 03:52:53'),(5,'NJ-STATE','NJ State Tax',0.0663,1,'2026-06-26 03:52:53'),(6,'CT-STATE','CT State Tax',0.0635,1,'2026-06-26 03:52:53'),(7,'EXEMPT','Tax Exempt',0.0000,1,'2026-06-26 03:53:22'),(8,'NY-STATE','NY State Tax',0.0400,1,'2026-06-26 03:53:22'),(9,'NY-CITY','NYC Tax',0.0450,1,'2026-06-26 03:53:22'),(10,'NY-COMBINED','NY Combined',0.0850,1,'2026-06-26 03:53:22'),(11,'NJ-STATE','NJ State Tax',0.0663,1,'2026-06-26 03:53:22'),(12,'CT-STATE','CT State Tax',0.0635,1,'2026-06-26 03:53:22');
/*!40000 ALTER TABLE `tax_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_groups`
--

DROP TABLE IF EXISTS `tax_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `rate` decimal(6,4) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_groups`
--

LOCK TABLES `tax_groups` WRITE;
/*!40000 ALTER TABLE `tax_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'readonly',
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `department` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','admin@maxtagroup.com','$2a$10$UIW2K3EfwZ.ffKKx3X2cL.y9jeqNgbbKqqkvLzj10Azml436o/X2.','Admin','User','admin',1,'2026-06-27 18:17:29','2026-06-25 22:52:45','2026-06-27 18:17:29',NULL),(2,'jsmith','jsmith@maxtagroup.com','$2a$10$D3OumPRQPWK3MdVL6ijfZO2EsVFDfA7sAnazw.Rv2VTJw2G0pmCca','John','Smith','sales',1,NULL,'2026-06-26 12:07:55','2026-06-26 12:07:55','Sales');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_items`
--

DROP TABLE IF EXISTS `vendor_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `vendor_id` int NOT NULL,
  `vendor_item_number` varchar(50) DEFAULT NULL,
  `vendor_description` varchar(255) DEFAULT NULL,
  `unit_cost` decimal(12,4) DEFAULT NULL,
  `lead_time_days` int DEFAULT '0',
  `min_order_qty` decimal(12,4) DEFAULT '1.0000',
  `is_preferred` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `vendor_id` (`vendor_id`),
  CONSTRAINT `vendor_items_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `vendor_items_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_items`
--

LOCK TABLES `vendor_items` WRITE;
/*!40000 ALTER TABLE `vendor_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_payments`
--

DROP TABLE IF EXISTS `vendor_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_number` varchar(20) NOT NULL,
  `check_number` varchar(20) DEFAULT NULL,
  `vendor_id` int NOT NULL,
  `ap_invoice_id` int DEFAULT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('check','wire','ach','credit_card','cash') DEFAULT 'check',
  `reference_number` varchar(50) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `bank_id` int DEFAULT NULL,
  `posted` tinyint(1) DEFAULT '0',
  `posted_date` datetime DEFAULT NULL,
  `gl_voucher_id` int DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_number` (`payment_number`),
  KEY `vendor_id` (`vendor_id`),
  KEY `bank_id` (`bank_id`),
  CONSTRAINT `vendor_payments_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`),
  CONSTRAINT `vendor_payments_ibfk_2` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_payments`
--

LOCK TABLES `vendor_payments` WRITE;
/*!40000 ALTER TABLE `vendor_payments` DISABLE KEYS */;
INSERT INTO `vendor_payments` VALUES (2,'PMT-01004','CHK-2001',1,NULL,'2026-06-25','check',NULL,500.00,1,0,NULL,NULL,NULL,1,'2026-06-25 23:41:11'),(3,'VP-1003','10001',1,NULL,'2026-06-26','check',NULL,2250.00,1,0,NULL,NULL,NULL,1,'2026-06-26 00:20:04'),(5,'VP-1006',NULL,1,3,'2026-06-26','check','CHK-8001',625.00,NULL,0,NULL,NULL,NULL,1,'2026-06-26 02:59:14');
/*!40000 ALTER TABLE `vendor_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_types`
--

DROP TABLE IF EXISTS `vendor_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_types`
--

LOCK TABLES `vendor_types` WRITE;
/*!40000 ALTER TABLE `vendor_types` DISABLE KEYS */;
INSERT INTO `vendor_types` VALUES (1,'Glass Supplier',NULL,1),(2,'Hardware Supplier',NULL,1),(3,'Chemical Supplier',NULL,1),(4,'Equipment',NULL,1),(5,'Service Provider',NULL,1),(6,'Glass Supplier',NULL,1),(7,'Hardware Supplier',NULL,1),(8,'Chemical Supplier',NULL,1),(9,'Equipment',NULL,1),(10,'Service Provider',NULL,1);
/*!40000 ALTER TABLE `vendor_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendors`
--

DROP TABLE IF EXISTS `vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendor_number` varchar(20) NOT NULL,
  `company_name` varchar(100) NOT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `address1` varchar(100) DEFAULT NULL,
  `address2` varchar(100) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip` varchar(20) DEFAULT NULL,
  `country` varchar(50) DEFAULT 'USA',
  `phone` varchar(30) DEFAULT NULL,
  `fax` varchar(30) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(100) DEFAULT NULL,
  `vendor_type_id` int DEFAULT NULL,
  `payment_terms` varchar(50) DEFAULT 'Net 30',
  `tax_id` varchar(50) DEFAULT NULL,
  `is_1099` tinyint(1) DEFAULT '0',
  `current_balance` decimal(12,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vendor_number` (`vendor_number`),
  KEY `vendor_type_id` (`vendor_type_id`),
  CONSTRAINT `vendors_ibfk_1` FOREIGN KEY (`vendor_type_id`) REFERENCES `vendor_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendors`
--

LOCK TABLES `vendors` WRITE;
/*!40000 ALTER TABLE `vendors` DISABLE KEYS */;
INSERT INTO `vendors` VALUES (1,'V-01003','Guardian Glass Supply','Mike Johnson','456 Industrial Blvd',NULL,'Detroit','MI','48201','USA','313-555-0200',NULL,'mike@guardianglass.com',NULL,NULL,'Net 45',NULL,0,0.00,1,NULL,'2026-06-25 23:38:17','2026-06-25 23:38:17');
/*!40000 ALTER TABLE `vendors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wo_fabrication`
--

DROP TABLE IF EXISTS `wo_fabrication`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wo_fabrication` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `fabrication_charge_id` int NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '1.00',
  `rate` decimal(10,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(255) DEFAULT '',
  `status` enum('pending','in_progress','completed') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fabrication_charge_id` (`fabrication_charge_id`),
  CONSTRAINT `wo_fabrication_ibfk_1` FOREIGN KEY (`fabrication_charge_id`) REFERENCES `fabrication_charges` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wo_fabrication`
--

LOCK TABLES `wo_fabrication` WRITE;
/*!40000 ALTER TABLE `wo_fabrication` DISABLE KEYS */;
/*!40000 ALTER TABLE `wo_fabrication` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wo_labor`
--

DROP TABLE IF EXISTS `wo_labor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wo_labor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `work_center_id` int DEFAULT NULL,
  `employee_id` int DEFAULT NULL,
  `wo_routing_id` int DEFAULT NULL,
  `employee_name` varchar(100) DEFAULT NULL,
  `work_date` date NOT NULL,
  `hours_worked` decimal(6,2) NOT NULL,
  `hours` decimal(6,2) DEFAULT '0.00',
  `rate` decimal(10,2) DEFAULT '0.00',
  `labor_type` enum('setup','run') DEFAULT 'run',
  `labor_rate` decimal(10,2) DEFAULT '0.00',
  `labor_cost` decimal(10,2) DEFAULT '0.00',
  `operation_sequence` int DEFAULT NULL,
  `notes` text,
  `entered_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `wo_routing_id` (`wo_routing_id`),
  CONSTRAINT `wo_labor_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `wo_labor_ibfk_2` FOREIGN KEY (`wo_routing_id`) REFERENCES `wo_routing` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wo_labor`
--

LOCK TABLES `wo_labor` WRITE;
/*!40000 ALTER TABLE `wo_labor` DISABLE KEYS */;
INSERT INTO `wo_labor` VALUES (1,1,1,1,NULL,NULL,'2026-06-25',4.50,4.50,75.00,'run',0.00,0.00,NULL,'Cutting glass panels',NULL,'2026-06-25 23:40:56');
/*!40000 ALTER TABLE `wo_labor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wo_materials`
--

DROP TABLE IF EXISTS `wo_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wo_materials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `line_number` int NOT NULL,
  `item_id` int NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity_required` decimal(12,4) NOT NULL,
  `waste_percent` decimal(5,2) DEFAULT '0.00',
  `total_qty` decimal(12,4) NOT NULL,
  `quantity_issued` decimal(12,4) DEFAULT '0.0000',
  `unit_cost` decimal(12,4) DEFAULT '0.0000',
  `total_cost` decimal(12,2) DEFAULT '0.00',
  `lot_number` varchar(50) DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `wo_materials_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wo_materials_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wo_materials`
--

LOCK TABLES `wo_materials` WRITE;
/*!40000 ALTER TABLE `wo_materials` DISABLE KEYS */;
INSERT INTO `wo_materials` VALUES (1,12,1,3,'Raw Clear Glass Sheet 48x96',5.0000,5.00,5.2500,0.0000,45.0000,236.25,NULL,NULL,'Outer glass lite - cut to size'),(2,12,2,3,'Raw Clear Glass Sheet 48x96',5.0000,5.00,5.2500,0.0000,45.0000,236.25,NULL,NULL,'Inner glass lite - cut to size'),(3,12,3,9,'PVB Interlayer Film 0.76mm',5.0000,3.00,5.1500,0.0000,2.5000,12.88,NULL,NULL,'PVB 0.76mm interlayer - cut in clean room'),(4,15,1,3,'Raw Clear Glass Sheet 48x96',10.0000,5.00,10.5000,0.0000,45.0000,472.50,NULL,NULL,NULL),(5,16,1,3,'Raw Clear Glass Sheet 48x96',3.0000,5.00,3.1500,0.0000,45.0000,141.75,NULL,NULL,'Outer glass lite - cut to size'),(6,16,2,3,'Raw Clear Glass Sheet 48x96',3.0000,5.00,3.1500,0.0000,45.0000,141.75,NULL,NULL,'Inner glass lite - cut to size'),(7,16,3,9,'PVB Interlayer Film 0.76mm',3.0000,3.00,3.0900,0.0000,2.5000,7.73,NULL,NULL,'PVB 0.76mm interlayer - cut in clean room'),(8,19,1,3,'Raw Clear Glass Sheet 48x96',5.0000,5.00,5.2500,5.2500,45.0000,472.50,NULL,NULL,NULL),(9,20,1,3,'Raw Clear Glass Sheet 48x96',3.0000,5.00,3.1500,0.0000,45.0000,141.75,NULL,NULL,'Outer glass lite - cut to size'),(10,20,2,3,'Raw Clear Glass Sheet 48x96',3.0000,5.00,3.1500,0.0000,45.0000,141.75,NULL,NULL,'Inner glass lite - cut to size'),(11,20,3,9,'PVB Interlayer Film 0.76mm',3.0000,3.00,3.0900,0.0000,2.5000,7.73,NULL,NULL,'PVB 0.76mm interlayer - cut in clean room'),(12,23,1,3,'Raw Clear Glass Sheet 48x96',3.0000,5.00,3.1500,0.0000,45.0000,141.75,NULL,NULL,NULL),(13,24,1,3,'Raw Clear Glass Sheet 48x96',3.0000,5.00,3.1500,0.0000,45.0000,141.75,NULL,NULL,NULL),(14,25,1,3,'Raw Clear Glass Sheet 48x96',3.0000,5.00,3.1500,0.0000,45.0000,141.75,NULL,NULL,NULL),(15,26,1,3,'Raw Clear Glass Sheet 48x96',3.0000,5.00,3.1500,0.0000,45.0000,141.75,NULL,NULL,NULL),(16,27,1,3,'Raw Clear Glass Sheet 48x96',3.0000,5.00,3.1500,0.0000,45.0000,141.75,NULL,NULL,NULL);
/*!40000 ALTER TABLE `wo_materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wo_receipts`
--

DROP TABLE IF EXISTS `wo_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wo_receipts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(20) NOT NULL,
  `work_order_id` int NOT NULL,
  `receipt_date` date NOT NULL,
  `quantity_completed` decimal(12,4) NOT NULL,
  `quantity_scrapped` decimal(12,4) DEFAULT '0.0000',
  `scrap_code` varchar(20) DEFAULT NULL,
  `is_final` tinyint(1) DEFAULT '0',
  `material_cost` decimal(12,2) DEFAULT '0.00',
  `labor_cost` decimal(12,2) DEFAULT '0.00',
  `setup_cost` decimal(12,2) DEFAULT '0.00',
  `overhead_cost` decimal(12,2) DEFAULT '0.00',
  `outside_cost` decimal(12,2) DEFAULT '0.00',
  `total_cost` decimal(12,2) DEFAULT '0.00',
  `location_id` int DEFAULT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `notes` text,
  `serial_number_start` varchar(100) DEFAULT NULL,
  `serial_number_end` varchar(100) DEFAULT NULL,
  `use_estimated_cost` tinyint(1) DEFAULT '0',
  `use_net_wip` tinyint(1) DEFAULT '0',
  `posted` tinyint(1) DEFAULT '0',
  `is_posted` tinyint(1) DEFAULT '0',
  `posted_date` datetime DEFAULT NULL,
  `entered_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `received_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `receipt_number` (`receipt_number`),
  KEY `work_order_id` (`work_order_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `wo_receipts_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `wo_receipts_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wo_receipts`
--

LOCK TABLES `wo_receipts` WRITE;
/*!40000 ALTER TABLE `wo_receipts` DISABLE KEYS */;
INSERT INTO `wo_receipts` VALUES (1,'WOR-01003',19,'2026-06-27',5.0000,0.0000,NULL,0,236.25,0.00,0.00,0.00,0.00,236.25,1,NULL,'E2E test',NULL,NULL,0,0,0,0,NULL,NULL,'2026-06-27 13:15:41',1);
/*!40000 ALTER TABLE `wo_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wo_routing`
--

DROP TABLE IF EXISTS `wo_routing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wo_routing` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `sequence` int NOT NULL,
  `operation_number` int DEFAULT NULL,
  `work_center_id` int NOT NULL,
  `operation_description` varchar(255) DEFAULT NULL,
  `setup_hours_estimated` decimal(8,4) DEFAULT '0.0000',
  `run_hours_estimated` decimal(8,4) DEFAULT '0.0000',
  `setup_hours_actual` decimal(8,4) DEFAULT '0.0000',
  `run_hours_actual` decimal(8,4) DEFAULT '0.0000',
  `quantity_completed` decimal(12,4) DEFAULT '0.0000',
  `quantity_scrapped` decimal(12,4) DEFAULT '0.0000',
  `status` enum('pending','in_progress','complete','completed') DEFAULT 'pending',
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `actual_start` datetime DEFAULT NULL,
  `actual_finish` datetime DEFAULT NULL,
  `actual_hours` decimal(8,4) DEFAULT '0.0000',
  `qc_required` tinyint(1) DEFAULT '0',
  `qc_passed` tinyint(1) DEFAULT NULL,
  `qc_notes` text,
  `qc_inspector_id` int DEFAULT NULL,
  `qc_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `work_center_id` (`work_center_id`),
  KEY `idx_wor_wo_seq` (`work_order_id`,`sequence`),
  CONSTRAINT `wo_routing_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wo_routing_ibfk_2` FOREIGN KEY (`work_center_id`) REFERENCES `work_centers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wo_routing`
--

LOCK TABLES `wo_routing` WRITE;
/*!40000 ALTER TABLE `wo_routing` DISABLE KEYS */;
INSERT INTO `wo_routing` VALUES (1,1,1,10,1,'Cut glass to size per drawing',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,'complete',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(2,1,2,20,2,'Edge processing - Flat Polish',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,'complete',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(3,1,3,30,5,'Wash and dry',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,'in_progress',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(4,1,4,40,6,'Temper in furnace',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,'in_progress','2026-06-26 12:04:29',NULL,'2026-06-26 12:04:29',NULL,0.0000,0,NULL,NULL,NULL,NULL),(5,1,5,50,8,'Quality inspection',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(6,1,6,60,9,'Pack for shipment',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(7,2,1,10,1,'Cut glass to size per drawing',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,'in_progress','2026-06-26 01:36:01',NULL,'2026-06-26 01:36:01',NULL,0.0000,0,NULL,NULL,NULL,NULL),(8,2,2,20,2,'Edge processing - Flat Polish',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,'in_progress','2026-06-26 16:09:07',NULL,'2026-06-26 16:09:07',NULL,0.0000,0,NULL,NULL,NULL,NULL),(9,2,3,30,5,'Wash and dry',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(10,2,4,40,6,'Temper in furnace',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(11,2,5,50,8,'Quality inspection',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(12,2,6,60,9,'Pack for shipment',0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(13,12,10,10,1,'Cut glass lites to size',0.2500,0.1000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(14,12,20,20,2,'Edge processing - seamed or polished',0.1500,0.1500,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(15,12,30,30,5,'Wash and dry before lamination',0.1000,0.0500,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(16,12,40,40,7,'Laminate with PVB/SGP interlayer in autoclave',0.5000,0.5000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(17,12,50,50,8,'Quality inspection - delamination check',0.1000,0.1000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,1,NULL,NULL,NULL,NULL),(18,12,60,60,9,'Pack for shipment',0.1000,0.1000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(19,13,10,10,1,'Cut glass to size per drawing',0.2500,0.1000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(20,13,20,20,2,'Edge processing per spec',0.1500,0.1500,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(21,14,10,10,1,'Cut glass to size per drawing',0.2500,0.1000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(22,14,20,20,2,'Edge processing per spec',0.1500,0.1500,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(23,15,10,10,1,'Cut glass to size per drawing',0.2500,0.2000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(24,15,20,20,2,'Edge processing per spec',0.1500,0.3000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(25,15,30,30,5,'Wash and dry before tempering',0.1000,0.1000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(26,15,40,40,6,'Temper in furnace per glass spec',0.5000,0.5000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(27,15,50,50,8,'Quality inspection - visual and stress test',0.1000,0.2000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,1,NULL,NULL,NULL,NULL),(28,15,60,60,9,'Pack for shipment or storage',0.1000,0.2000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(29,16,10,10,1,'Cut glass lites to size',0.2500,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(30,16,20,20,2,'Edge processing - seamed or polished',0.1500,0.0900,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(31,16,30,30,5,'Wash and dry before lamination',0.1000,0.0300,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(32,16,40,40,7,'Laminate with PVB/SGP interlayer in autoclave',0.5000,0.3000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(33,16,50,50,8,'Quality inspection - delamination check',0.1000,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,1,NULL,NULL,NULL,NULL),(34,16,60,60,9,'Pack for shipment',0.1000,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(35,17,10,10,1,'Cut glass to size per drawing',0.2500,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(36,17,20,20,2,'Edge processing per spec',0.1500,0.0900,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(37,18,10,10,1,'Cut glass to size per drawing',0.2500,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(38,18,20,20,2,'Edge processing per spec',0.1500,0.0900,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(39,19,10,10,1,'Cut glass to size per drawing',0.2500,0.1000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(40,19,20,20,2,'Edge processing per spec',0.1500,0.1500,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(41,19,30,30,5,'Wash and dry before tempering',0.1000,0.0500,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(42,19,40,40,6,'Temper in furnace per glass spec',0.5000,0.2500,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(43,19,50,50,8,'Quality inspection - visual and stress test',0.1000,0.1000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,1,NULL,NULL,NULL,NULL),(44,19,60,60,9,'Pack for shipment or storage',0.1000,0.1000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(45,20,10,10,1,'Cut glass lites to size',0.2500,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(46,20,20,20,2,'Edge processing - seamed or polished',0.1500,0.0900,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(47,20,30,30,5,'Wash and dry before lamination',0.1000,0.0300,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(48,20,40,40,7,'Laminate with PVB/SGP interlayer in autoclave',0.5000,0.3000,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(49,20,50,50,8,'Quality inspection - delamination check',0.1000,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,1,NULL,NULL,NULL,NULL),(50,20,60,60,9,'Pack for shipment',0.1000,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(51,21,10,10,1,'Cut glass to size per drawing',0.2500,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(52,21,20,20,2,'Edge processing per spec',0.1500,0.0900,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(53,22,10,10,1,'Cut glass to size per drawing',0.2500,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(54,22,20,20,2,'Edge processing per spec',0.1500,0.0900,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(55,23,10,10,1,'Cut glass to size per drawing',0.2500,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(56,23,20,20,2,'Edge processing per spec',0.1500,0.0900,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(57,23,30,30,5,'Wash and dry before tempering',0.1000,0.0300,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(58,23,40,40,6,'Temper in furnace per glass spec',0.5000,0.1500,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(59,23,50,50,8,'Quality inspection - visual and stress test',0.1000,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,1,NULL,NULL,NULL,NULL),(60,23,60,60,9,'Pack for shipment or storage',0.1000,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(61,24,10,10,1,'Cut glass to size per drawing',0.2500,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(62,24,20,20,2,'Edge processing per spec',0.1500,0.0900,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(63,24,30,30,5,'Wash and dry before tempering',0.1000,0.0300,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(64,24,40,40,6,'Temper in furnace per glass spec',0.5000,0.1500,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(65,24,50,50,8,'Quality inspection - visual and stress test',0.1000,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,1,NULL,NULL,NULL,NULL),(66,24,60,60,9,'Pack for shipment or storage',0.1000,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(67,25,10,10,1,'Cut glass to size per drawing',0.2500,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(68,25,20,20,2,'Edge processing per spec',0.1500,0.0900,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(69,25,30,30,5,'Wash and dry before tempering',0.1000,0.0300,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(70,25,40,40,6,'Temper in furnace per glass spec',0.5000,0.1500,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(71,25,50,50,8,'Quality inspection - visual and stress test',0.1000,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,1,NULL,NULL,NULL,NULL),(72,25,60,60,9,'Pack for shipment or storage',0.1000,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(73,26,10,10,1,'Cut glass to size per drawing',0.2500,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(74,26,20,20,2,'Edge processing per spec',0.1500,0.0900,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(75,26,30,30,5,'Wash and dry before tempering',0.1000,0.0300,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(76,26,40,40,6,'Temper in furnace per glass spec',0.5000,0.1500,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(77,26,50,50,8,'Quality inspection - visual and stress test',0.1000,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,1,NULL,NULL,NULL,NULL),(78,26,60,60,9,'Pack for shipment or storage',0.1000,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(79,27,10,10,1,'Cut glass to size per drawing',0.2500,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(80,27,20,20,2,'Edge processing per spec',0.1500,0.0900,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(81,27,30,30,5,'Wash and dry before tempering',0.1000,0.0300,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(82,27,40,40,6,'Temper in furnace per glass spec',0.5000,0.1500,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL),(83,27,50,50,8,'Quality inspection - visual and stress test',0.1000,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,1,NULL,NULL,NULL,NULL),(84,27,60,60,9,'Pack for shipment or storage',0.1000,0.0600,0.0000,0.0000,0.0000,0.0000,'pending',NULL,NULL,NULL,NULL,0.0000,0,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `wo_routing` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_center_capacity`
--

DROP TABLE IF EXISTS `work_center_capacity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_center_capacity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_center_id` int NOT NULL,
  `day_of_week` tinyint NOT NULL,
  `shift_start` time NOT NULL DEFAULT '07:00:00',
  `shift_end` time NOT NULL DEFAULT '17:00:00',
  `capacity_hours` decimal(5,2) DEFAULT '10.00',
  `max_concurrent_jobs` int DEFAULT '1',
  `is_available` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_center_id` (`work_center_id`),
  CONSTRAINT `work_center_capacity_ibfk_1` FOREIGN KEY (`work_center_id`) REFERENCES `work_centers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=255 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_center_capacity`
--

LOCK TABLES `work_center_capacity` WRITE;
/*!40000 ALTER TABLE `work_center_capacity` DISABLE KEYS */;
INSERT INTO `work_center_capacity` VALUES (1,3,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(2,3,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(3,3,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(4,3,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(5,3,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(6,1,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(7,1,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(8,1,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(9,1,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(10,1,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(11,4,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(12,4,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(13,4,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(14,4,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(15,4,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(16,2,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(17,2,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(18,2,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(19,2,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(20,2,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(21,16,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(22,16,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(23,16,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(24,16,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(25,16,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(26,17,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(27,17,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(28,17,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(29,17,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(30,17,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(31,11,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(32,11,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(33,11,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(34,11,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(35,11,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(36,7,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(37,7,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(38,7,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(39,7,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(40,7,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(41,10,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(42,10,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(43,10,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(44,10,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(45,10,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(46,9,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(47,9,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(48,9,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(49,9,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(50,9,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(51,8,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(52,8,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(53,8,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(54,8,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(55,8,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(56,6,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(57,6,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(58,6,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(59,6,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(60,6,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(61,5,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(62,5,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(63,5,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(64,5,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(65,5,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:08:17'),(128,17,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(129,16,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(130,11,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(131,10,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(132,9,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(133,8,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(134,7,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(135,6,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(136,5,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(137,4,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(138,3,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(139,2,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(140,1,1,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(141,17,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(142,16,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(143,11,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(144,10,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(145,9,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(146,8,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(147,7,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(148,6,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(149,5,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(150,4,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(151,3,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(152,2,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(153,1,2,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(154,17,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(155,16,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(156,11,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(157,10,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(158,9,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(159,8,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(160,7,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(161,6,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(162,5,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(163,4,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(164,3,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(165,2,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(166,1,3,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(167,17,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(168,16,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(169,11,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(170,10,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(171,9,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(172,8,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(173,7,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(174,6,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(175,5,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(176,4,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(177,3,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(178,2,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(179,1,4,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(180,17,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(181,16,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(182,11,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(183,10,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(184,9,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(185,8,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(186,7,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(187,6,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(188,5,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(189,4,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(190,3,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(191,2,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34'),(192,1,5,'07:00:00','17:00:00',10.00,1,1,'2026-06-27 10:20:34');
/*!40000 ALTER TABLE `work_center_capacity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_centers`
--

DROP TABLE IF EXISTS `work_centers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_centers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `department` varchar(50) DEFAULT NULL,
  `capacity_type` enum('hours','units','sqft','linear_inches','weight') DEFAULT 'hours',
  `available_hours_per_day` decimal(5,2) DEFAULT '8.00',
  `num_machines` int DEFAULT '1',
  `efficiency_rate` decimal(5,2) DEFAULT '100.00',
  `labor_rate` decimal(10,2) DEFAULT '0.00',
  `overhead_rate` decimal(10,2) DEFAULT '0.00',
  `queue_time_hours` decimal(5,2) DEFAULT '0.00',
  `move_time_hours` decimal(5,2) DEFAULT '0.00',
  `scheduling_type` enum('finite','infinite') DEFAULT 'infinite',
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text,
  `sequence_order` int DEFAULT '0',
  `color` varchar(20) DEFAULT 'blue',
  `icon` varchar(10) DEFAULT '⚙️',
  `description` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_centers`
--

LOCK TABLES `work_centers` WRITE;
/*!40000 ALTER TABLE `work_centers` DISABLE KEYS */;
INSERT INTO `work_centers` VALUES (1,'CUT','Cutting Table','Cutting','sqft',8.00,1,100.00,25.00,15.00,0.00,0.00,'infinite',1,NULL,1,'#2563eb','✂️','Glass cutting table - score and break raw glass sheets to size'),(2,'EDGE','Edge Polisher','Polishing','linear_inches',8.00,1,100.00,30.00,12.00,0.00,0.00,'infinite',1,NULL,2,'#06b6d4','💎','Edge grinding, polishing, beveling, and seaming'),(3,'CNC','CNC/Waterjet','Fabrication','hours',8.00,1,100.00,45.00,25.00,0.00,0.00,'infinite',1,NULL,3,'#7c3aed','🔧','CNC machining - holes, notches, cutouts, milling'),(4,'DRILL','Drilling Station','Fabrication','hours',8.00,1,100.00,28.00,10.00,0.00,0.00,'infinite',1,NULL,4,'#8b5cf6','🕳️','Drilling station for hardware holes'),(5,'WASH','Wash Line','Preparation','sqft',8.00,1,100.00,15.00,8.00,0.00,0.00,'infinite',1,NULL,5,'#6b7280','🚿','Glass washing line - remove dust and contaminants'),(6,'TEMP','Tempering Oven','Tempering','sqft',8.00,1,100.00,35.00,40.00,0.00,0.00,'infinite',1,NULL,6,'#dc2626','🔥','Tempering furnace - heat to 620C and rapid quench'),(7,'LAMI','Lamination Line','Lamination','sqft',8.00,1,100.00,32.00,20.00,0.00,0.00,'infinite',1,NULL,7,'#16a34a','🧪','Lamination line - PVB/SGP interlayer bonding with autoclave'),(8,'QC','Quality Control','Inspection','units',8.00,1,100.00,22.00,5.00,0.00,0.00,'infinite',1,NULL,8,'#f59e0b','✅','Quality control inspection - visual, dimensional, stress testing'),(9,'PACK','Packing Station','Shipping','units',8.00,1,100.00,18.00,8.00,0.00,0.00,'infinite',1,NULL,9,'#4b5563','📦','Packing and crating for shipment'),(10,'LAMI2','Lamination','Production','hours',8.00,1,100.00,95.00,35.00,0.00,0.00,'infinite',1,NULL,0,'#16a34a','🧪','Lamination department - secondary line'),(11,'INSP','Quality Inspection','QC','hours',8.00,1,100.00,50.00,15.00,0.00,0.00,'infinite',1,NULL,0,'blue','⚙️',NULL),(16,'HST','Heat Soak Test','Tempering','sqft',8.00,1,100.00,0.00,0.00,0.00,0.00,'infinite',1,NULL,7,'#ea580c','♨️','Heat soak testing at 290C to detect NiS inclusions'),(17,'IGU','IGU Assembly','Insulated Glass','sqft',8.00,1,100.00,0.00,0.00,0.00,0.00,'infinite',1,NULL,8,'#0d9488','🪟','Insulated glass unit assembly - spacer, seal, gas fill');
/*!40000 ALTER TABLE `work_centers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_orders`
--

DROP TABLE IF EXISTS `work_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(20) NOT NULL,
  `wo_type` varchar(20) DEFAULT NULL,
  `wo_category` enum('standard','assembly','glass_component','interlayer_component') DEFAULT 'standard',
  `item_id` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity` decimal(12,4) NOT NULL,
  `quantity_completed` decimal(12,4) DEFAULT '0.0000',
  `qty_completed` decimal(12,4) DEFAULT '0.0000',
  `quantity_scrapped` decimal(12,4) DEFAULT '0.0000',
  `qty_scrapped` decimal(12,4) DEFAULT '0.0000',
  `sales_order_id` int DEFAULT NULL,
  `sales_order_line_id` int DEFAULT NULL,
  `parent_wo_id` int DEFAULT NULL,
  `sales_order_line` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `status` enum('planned','scheduled','released','in_progress','complete','completed','closed','cancelled') DEFAULT 'planned',
  `priority` varchar(20) DEFAULT 'Normal',
  `scheduling_type` enum('forward','backward','floating') DEFAULT 'floating',
  `release_date` date DEFAULT NULL,
  `order_date` date DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `finish_date` date DEFAULT NULL,
  `actual_finish_date` datetime DEFAULT NULL,
  `requested_date` date DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `estimated_material_cost` decimal(12,2) DEFAULT '0.00',
  `estimated_labor_cost` decimal(12,2) DEFAULT '0.00',
  `estimated_setup_cost` decimal(12,2) DEFAULT '0.00',
  `estimated_overhead_cost` decimal(12,2) DEFAULT '0.00',
  `estimated_outside_cost` decimal(12,2) DEFAULT '0.00',
  `actual_material_cost` decimal(12,2) DEFAULT '0.00',
  `actual_labor_cost` decimal(12,2) DEFAULT '0.00',
  `actual_setup_cost` decimal(12,2) DEFAULT '0.00',
  `actual_overhead_cost` decimal(12,2) DEFAULT '0.00',
  `actual_outside_cost` decimal(12,2) DEFAULT '0.00',
  `project_number` varchar(50) DEFAULT NULL,
  `purchase_order` varchar(50) DEFAULT NULL,
  `service_job` varchar(50) DEFAULT NULL,
  `comments` text,
  `wo_printed` tinyint(1) DEFAULT '0',
  `entered_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `wo_number` varchar(20) DEFAULT NULL,
  `notes` text,
  `product_type` varchar(50) DEFAULT 'custom',
  `glass_type` varchar(50) DEFAULT NULL,
  `thickness` varchar(20) DEFAULT NULL,
  `width` decimal(10,2) DEFAULT NULL,
  `height` decimal(10,2) DEFAULT NULL,
  `edge_type` varchar(50) DEFAULT NULL,
  `interlayer_type` varchar(50) DEFAULT NULL,
  `glass_makeup` json DEFAULT NULL,
  `has_holes` tinyint(1) DEFAULT '0',
  `has_notches` tinyint(1) DEFAULT '0',
  `hole_specs` text,
  `routing_template_id` int DEFAULT NULL,
  `current_station_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `item_id` (`item_id`),
  KEY `sales_order_id` (`sales_order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `location_id` (`location_id`),
  KEY `idx_wo_status` (`status`),
  KEY `idx_wo_product_type` (`product_type`),
  KEY `idx_wo_parent` (`parent_wo_id`),
  CONSTRAINT `work_orders_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `work_orders_ibfk_2` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `work_orders_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `work_orders_ibfk_4` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_orders`
--

LOCK TABLES `work_orders` WRITE;
/*!40000 ALTER TABLE `work_orders` DISABLE KEYS */;
INSERT INTO `work_orders` VALUES (1,'WO-20003',NULL,'standard',2,NULL,10.0000,0.0000,0.0000,0.0000,1.0000,NULL,NULL,NULL,NULL,NULL,'in_progress','high','floating',NULL,NULL,'2026-06-25','2026-07-01',NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,1,'2026-06-25 23:39:53','2026-06-26 12:04:51',NULL,'Urgent order','tempered_panel','Clear Float','6.00',24.00,36.00,'Flat Polish',NULL,NULL,0,0,NULL,NULL,6),(2,'WO-20005',NULL,'standard',2,NULL,100.0000,0.0000,0.0000,0.0000,1.0000,NULL,NULL,NULL,NULL,NULL,'in_progress','normal','floating',NULL,NULL,'2026-06-27','2026-07-05',NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,1,'2026-06-26 00:18:59','2026-06-26 16:09:46',NULL,'Rush order for ABC Glass','tempered_panel','Clear Float','6.00',24.00,36.00,'Flat Polish',NULL,NULL,0,0,NULL,NULL,2),(4,'WO-20012',NULL,'standard',NULL,NULL,25.0000,0.0000,0.0000,0.0000,0.0000,5,2,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-26',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-26 02:16:30','2026-06-26 02:16:30',NULL,'Standard balustrade panel with 4 mounting holes','tempered_laminated','Clear Float','10mm',48.00,42.00,'Flat Polish','PVB 0.76mm',NULL,1,0,NULL,NULL,NULL),(5,'WO-20013',NULL,'standard',NULL,NULL,10.0000,0.0000,0.0000,0.0000,0.0000,5,3,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-26',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-26 02:16:30','2026-06-26 02:16:30',NULL,'End panels - same spec as standard but narrower','tempered_laminated','Clear Float','10mm',36.00,42.00,'Flat Polish','PVB 0.76mm',NULL,1,0,NULL,NULL,NULL),(6,'WO-20014',NULL,'standard',NULL,NULL,15.0000,0.0000,0.0000,0.0000,0.0000,5,4,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-26',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-26 02:16:30','2026-06-26 02:16:30',NULL,'IGU: 6mm Low-E / 12mm Argon / 6mm Clear. Warm edge spacer.','igu_low_e','Low-E','6mm',60.00,72.00,'Seamed',NULL,NULL,0,0,NULL,NULL,NULL),(7,'WO-20015',NULL,'standard',NULL,NULL,8.0000,0.0000,0.0000,0.0000,0.0000,6,5,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-26',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-26 02:32:10','2026-06-26 02:32:10',NULL,'Standard storefront panel - heat soak test required','tempered_panel','Clear Float','6mm',48.00,72.00,'Flat Polish',NULL,NULL,0,0,NULL,NULL,NULL),(8,'WO-20016',NULL,'standard',NULL,NULL,4.0000,0.0000,0.0000,0.0000,0.0000,6,6,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-26',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-26 02:32:11','2026-06-26 02:32:11',NULL,'Door lite with 2 hinge holes - tight tolerance','tempered_panel','Clear Float','10mm',24.00,60.00,'Pencil Polish',NULL,NULL,1,0,NULL,NULL,NULL),(9,'WO-20017',NULL,'standard',NULL,NULL,6.0000,0.0000,0.0000,0.0000,0.0000,6,7,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-26',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-26 02:32:11','2026-06-26 02:32:11',NULL,'Black ceramic frit spandrel - tempered','tempered_panel','Spandrel Black','6mm',48.00,48.00,'Seamed',NULL,NULL,0,0,NULL,NULL,NULL),(10,'WO-20018',NULL,'standard',2,NULL,5.0000,0.0000,0.0000,0.0000,0.0000,8,9,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-26',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-26 23:38:27','2026-06-26 23:38:27',NULL,NULL,'tempered_panel','Clear Float','8mm',NULL,NULL,NULL,NULL,NULL,0,0,NULL,NULL,NULL),(12,'WO-20020',NULL,'standard',8,NULL,5.0000,0.0000,0.0000,0.0000,0.0000,11,12,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 12:39:32','2026-06-27 12:39:32',NULL,NULL,'laminated',NULL,NULL,47.24,94.49,NULL,NULL,NULL,0,0,NULL,NULL,1),(13,'WO-20021',NULL,'glass_component',3,NULL,5.0000,0.0000,0.0000,0.0000,0.0000,11,NULL,12,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 12:39:32','2026-06-27 12:39:32',NULL,'Glass lite cutting for WO-20020','tempered_panel',NULL,NULL,47.24,94.49,NULL,NULL,NULL,0,0,NULL,NULL,NULL),(14,'WO-20022',NULL,'glass_component',3,NULL,5.0000,0.0000,0.0000,0.0000,0.0000,11,NULL,12,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 12:39:32','2026-06-27 12:39:32',NULL,'Glass lite cutting for WO-20020','tempered_panel',NULL,NULL,47.24,94.49,NULL,NULL,NULL,0,0,NULL,NULL,NULL),(15,'WO-20023',NULL,'standard',2,NULL,10.0000,0.0000,0.0000,0.0000,0.0000,12,13,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 12:46:21','2026-06-27 12:46:21',NULL,NULL,'tempered_panel','Clear Float',NULL,24.00,36.00,NULL,NULL,NULL,0,0,NULL,NULL,1),(16,'WO-20024',NULL,'standard',8,NULL,3.0000,0.0000,0.0000,0.0000,0.0000,13,14,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 12:47:08','2026-06-27 12:47:09',NULL,NULL,'laminated','Clear Float',NULL,48.00,72.00,NULL,NULL,NULL,0,0,NULL,NULL,1),(17,'WO-20025',NULL,'glass_component',3,NULL,3.0000,0.0000,0.0000,0.0000,0.0000,13,NULL,16,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 12:47:09','2026-06-27 12:47:09',NULL,'Glass lite cutting for WO-20024','tempered_panel',NULL,NULL,48.00,72.00,NULL,NULL,NULL,0,0,NULL,NULL,NULL),(18,'WO-20026',NULL,'glass_component',3,NULL,3.0000,0.0000,0.0000,0.0000,0.0000,13,NULL,16,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 12:47:09','2026-06-27 12:47:09',NULL,'Glass lite cutting for WO-20024','tempered_panel',NULL,NULL,48.00,72.00,NULL,NULL,NULL,0,0,NULL,NULL,NULL),(19,'WO-20027',NULL,'standard',2,NULL,5.0000,0.0000,5.0000,0.0000,0.0000,14,15,NULL,NULL,NULL,'completed','normal','floating','2026-06-27',NULL,'2026-06-27',NULL,'2026-06-27 13:15:41',NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 13:14:57','2026-06-27 13:15:41',NULL,NULL,'tempered_panel','tempered','6mm',NULL,NULL,NULL,NULL,NULL,0,0,NULL,NULL,1),(20,'WO-20028',NULL,'standard',8,NULL,3.0000,0.0000,0.0000,0.0000,0.0000,13,14,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 13:25:55','2026-06-27 13:25:55',NULL,NULL,'laminated','Clear Float',NULL,48.00,72.00,NULL,NULL,NULL,0,0,NULL,NULL,1),(21,'WO-20029',NULL,'glass_component',3,NULL,3.0000,0.0000,0.0000,0.0000,0.0000,13,NULL,20,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 13:25:55','2026-06-27 13:25:55',NULL,'Glass lite cutting for WO-20028','tempered_panel',NULL,NULL,48.00,72.00,NULL,NULL,NULL,0,0,NULL,NULL,NULL),(22,'WO-20030',NULL,'glass_component',3,NULL,3.0000,0.0000,0.0000,0.0000,0.0000,13,NULL,20,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 13:25:55','2026-06-27 13:25:55',NULL,'Glass lite cutting for WO-20028','tempered_panel',NULL,NULL,48.00,72.00,NULL,NULL,NULL,0,0,NULL,NULL,NULL),(23,'WO-20031',NULL,'standard',2,NULL,3.0000,0.0000,0.0000,0.0000,0.0000,15,16,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 13:39:26','2026-06-27 13:39:26',NULL,NULL,'tempered_panel',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0,NULL,NULL,1),(24,'WO-20032',NULL,'standard',2,NULL,3.0000,0.0000,0.0000,0.0000,0.0000,16,17,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 13:40:17','2026-06-27 13:40:17',NULL,NULL,'tempered_panel',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0,NULL,NULL,1),(25,'WO-20033',NULL,'standard',2,NULL,3.0000,0.0000,0.0000,0.0000,0.0000,17,18,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 14:02:40','2026-06-27 14:02:40',NULL,NULL,'tempered_panel',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0,NULL,NULL,1),(26,'WO-20034',NULL,'standard',2,NULL,3.0000,0.0000,0.0000,0.0000,0.0000,18,19,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 14:14:10','2026-06-27 14:14:11',NULL,NULL,'tempered_panel',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0,NULL,NULL,1),(27,'WO-20035',NULL,'standard',2,NULL,3.0000,0.0000,0.0000,0.0000,0.0000,19,20,NULL,NULL,NULL,'planned','normal','floating',NULL,NULL,'2026-06-27',NULL,NULL,NULL,NULL,NULL,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,NULL,NULL,NULL,NULL,0,NULL,'2026-06-27 14:32:06','2026-06-27 14:32:06',NULL,NULL,'tempered_panel',NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0,NULL,NULL,1);
/*!40000 ALTER TABLE `work_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'maxta_erp'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-27 18:53:36
