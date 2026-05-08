from flask import Flask, request, jsonify, render_template
import psycopg2
import boto3
import os
import uuid
from datetime import datetime

app = Flask(__name__, template_folder='../frontend')

# Config dari Environment Variables
DB_HOST = os.environ.get('DB_HOST')
DB_NAME = os.environ.get('DB_NAME', 'transkota')
DB_USER = os.environ.get('DB_USER', 'admin')
DB_PASS = os.environ.get('DB_PASS')
S3_BUCKET = os.environ.get('S3_BUCKET')
CLOUDFRONT_URL = os.environ.get('CLOUDFRONT_URL')
AWS_REGION = os.environ.get('AWS_REGION', 'ap-southeast-1')

def get_db():
    return psycopg2.connect(
        host=DB_HOST, database=DB_NAME,
        user=DB_USER, password=DB_PASS
    )

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS laporan (
            id SERIAL PRIMARY KEY,
            jenis VARCHAR(50),
            lokasi TEXT,
            deskripsi TEXT,
            foto_url TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS rute (
            id SERIAL PRIMARY KEY,
            nama_rute VARCHAR(100),
            asal VARCHAR(100),
            tujuan VARCHAR(100),
            jadwal TEXT,
            status VARCHAR(20) DEFAULT 'aktif'
        );
    """)
    conn.commit()
    cur.close()
    conn.close()

# ─── FITUR 1: Halaman Utama / Info Rute ───────────────────
@app.route('/')
def index():
    return render_template('index.html', cloudfront_url=CLOUDFRONT_URL)

@app.route('/api/rute', methods=['GET'])
def get_rute():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM rute WHERE status='aktif' ORDER BY id")
    rows = cur.fetchall()
    cur.close(); conn.close()
    result = [{'id': r[0], 'nama': r[1], 'asal': r[2],
               'tujuan': r[3], 'jadwal': r[4]} for r in rows]
    return jsonify(result)

@app.route('/api/rute', methods=['POST'])
def add_rute():
    data = request.json
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO rute (nama_rute, asal, tujuan, jadwal) VALUES (%s,%s,%s,%s)",
        (data['nama_rute'], data['asal'], data['tujuan'], data['jadwal'])
    )
    conn.commit(); cur.close(); conn.close()
    return jsonify({'message': 'Rute berhasil ditambahkan'}), 201

# ─── FITUR 2: Pelaporan Kemacetan/Kecelakaan + Upload S3 ──
@app.route('/api/laporan', methods=['POST'])
def buat_laporan():
    jenis = request.form.get('jenis')
    lokasi = request.form.get('lokasi')
    deskripsi = request.form.get('deskripsi')
    foto_url = None

    # Upload foto ke S3
    if 'foto' in request.files:
        foto = request.files['foto']
        if foto.filename:
            ext = foto.filename.rsplit('.', 1)[-1]
            key = f"laporan/{uuid.uuid4()}.{ext}"
            s3 = boto3.client('s3', region_name=AWS_REGION)
            s3.upload_fileobj(
                foto, S3_BUCKET, key,
                ExtraArgs={'ContentType': foto.content_type}
            )
            # URL via CloudFront, BUKAN langsung S3
            foto_url = f"{CLOUDFRONT_URL}/{key}"

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO laporan (jenis, lokasi, deskripsi, foto_url) VALUES (%s,%s,%s,%s)",
        (jenis, lokasi, deskripsi, foto_url)
    )
    conn.commit(); cur.close(); conn.close()
    return jsonify({'message': 'Laporan berhasil dikirim', 'foto_url': foto_url}), 201

@app.route('/api/laporan', methods=['GET'])
def get_laporan():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM laporan ORDER BY created_at DESC LIMIT 50")
    rows = cur.fetchall()
    cur.close(); conn.close()
    result = [{'id': r[0], 'jenis': r[1], 'lokasi': r[2],
               'deskripsi': r[3], 'foto_url': r[4],
               'waktu': str(r[5])} for r in rows]
    return jsonify(result)

# ─── FITUR 3: Status Real-time Kendaraan ──────────────────
@app.route('/api/monitoring', methods=['GET'])
def monitoring():
    # Simulasi data semi real-time (bisa diganti GPS tracker nyata)
    data = [
        {'id': 1, 'rute': 'Cicaheum - Cibiru', 'status': 'Beroperasi', 'posisi': 'Jl. A. Yani KM 5'},
        {'id': 2, 'rute': 'Leuwipanjang - Dago', 'status': 'Beroperasi', 'posisi': 'Jl. Merdeka'},
        {'id': 3, 'rute': 'Antapani - Ciroyom', 'status': 'Tidak Beroperasi', 'posisi': '-'},
    ]
    return jsonify(data)

# ─── Health Check ──────────────────────────────────────────
@app.route('/health')
def health():
    return jsonify({'status': 'ok'}), 200

with app.app_context():
    init_db()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)