# Đóng gói container cho phân hệ Backend API Server
# Sử dụng Python 3.12 slim để tối ưu dung lượng image

FROM python:3.12-slim

# Thiết lập thư mục làm việc bên trong container
WORKDIR /app

# Sao chép danh sách thư viện và cài đặt trước (tận dụng Docker layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ mã nguồn ứng dụng
COPY app/ ./app/

# Mở cổng mặc định của Uvicorn
EXPOSE 8000

# Lệnh khởi chạy API Server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
