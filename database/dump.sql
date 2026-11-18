-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: localhost    Database: toll_system
-- ------------------------------------------------------
-- Server version	8.0.40

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
-- Table structure for table `invoices`

--
DROP TABLE IF EXISTS `blacklisted_tokens`;

CREATE TABLE blacklisted_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token TEXT NOT NULL
);


DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `invoice_id` int NOT NULL AUTO_INCREMENT,
  `issuing_op_id` varchar(255) NOT NULL,
  `receiving_op_id` varchar(255) NOT NULL,
  `invoice_month` date NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `issue_date` date NOT NULL,
  `invoice_status` varchar(255) DEFAULT 'Pending',
  PRIMARY KEY (`invoice_id`),
  UNIQUE KEY `issuing_op_id` (`issuing_op_id`,`receiving_op_id`,`invoice_month`),
  KEY `receiving_op_id` (`receiving_op_id`),
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`issuing_op_id`) REFERENCES `operators` (`op_id`),
  CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`receiving_op_id`) REFERENCES `operators` (`op_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `operators`
--

DROP TABLE IF EXISTS `operators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `operators` (
  `op_id` varchar(255) NOT NULL,
  `operator_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  PRIMARY KEY (`op_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `passes`
--

DROP TABLE IF EXISTS `passes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `passes` (
  `pass_id` int NOT NULL AUTO_INCREMENT,
  `pass_time` datetime NOT NULL,
  `toll_id` varchar(255) NOT NULL,
  `tag_home_op_id` varchar(255) NOT NULL,
  `charge` decimal(10,2) NOT NULL,
  `tag_ref` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`pass_id`),
  UNIQUE KEY `unique_pass` (`pass_time`,`toll_id`,`tag_ref`),
  KEY `toll_id` (`toll_id`),
  KEY `tag_home_op_id` (`tag_home_op_id`),
  CONSTRAINT `passes_ibfk_1` FOREIGN KEY (`toll_id`) REFERENCES `toll_stations` (`toll_id`),
  CONSTRAINT `passes_ibfk_2` FOREIGN KEY (`tag_home_op_id`) REFERENCES `operators` (`op_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2005 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `toll_stations`
--

DROP TABLE IF EXISTS `toll_stations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `toll_stations` (
  `toll_id` varchar(255) NOT NULL,
  `op_id` varchar(255) NOT NULL,
  `toll_name` varchar(255) NOT NULL,
  `pm` varchar(255) DEFAULT NULL,
  `locality` varchar(255) DEFAULT NULL,
  `road` varchar(255) DEFAULT NULL,
  `lat` decimal(10,6) DEFAULT NULL,
  `longitude` decimal(10,6) DEFAULT NULL,
  `price` decimal(5,2) NOT NULL,
  PRIMARY KEY (`toll_id`),
  KEY `op_id` (`op_id`),
  CONSTRAINT `toll_stations_ibfk_1` FOREIGN KEY (`op_id`) REFERENCES `operators` (`op_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `user_role` enum('admin','operator','viewer') DEFAULT 'viewer',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;


-- Insert multiple users and update password_hash on duplicate key
INSERT INTO users (username, password_hash, user_role)
VALUES 
    ('admin', SHA2('freepasses4all', 256), 'admin'),
    ('OO_operator', SHA2('OO_operator_1', 256), 'operator'),
    ('NO_operator', SHA2('NO_operator_1', 256), 'operator'),
    ('NAO_operator', SHA2('NAO_operator_1', 256), 'operator'),
    ('MO_operator', SHA2('MO_operator_1', 256), 'operator'),
    ('KO_operator', SHA2('KO_operator_1', 256), 'operator'),
    ('EG_operator', SHA2('EG_operator_1', 256), 'operator'),
    ('AM_operator', SHA2('AM_operator_1', 256), 'operator')
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash);



/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-12-28  7:57:51
