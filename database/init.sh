#!/bin/bash
# Script này được chạy tự động bởi docker-entrypoint-initdb.d khi volume MySQL trống.
# Dùng shell script thay vì .sql trực tiếp để đảm bảo DELIMITER $$ trong
# procedures.sql được xử lý đúng bởi mysql client.

echo "[init] Đang load tables.sql..."
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < /db_files/tables.sql

echo "[init] Đang load seeds.sql..."
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < /db_files/seeds.sql

echo "[init] Đang load procedures.sql..."
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < /db_files/procedures.sql

echo "[init] Hoàn tất khởi tạo database DADN."
