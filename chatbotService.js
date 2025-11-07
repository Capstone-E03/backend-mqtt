// Map untuk menerjemahkan kode status (Tidak berubah)
const freshnessMap = {
  SS: "Sangat Segar", S: "Segar", KS: "Kurang Segar", B: "Busuk",
};
const preservationMap = {
  SB: "Sangat Baik", B: "Baik", KB: "Kurang Baik", BR: "Buruk",
};

// ID khusus untuk menandakan respons default
const DEFAULT_RESPONSE_ID = "MAAF_SAYA_TIDAK_MENGERTI";

/**
 * Helper untuk memberikan status ringkas (Tidak berubah)
 */
function getStatusResponse(cache) {
  const { sensor, fresh, preservation, monitoringStartedAt } = cache;
  
  if (!monitoringStartedAt) {
    return "Sistem saat ini sedang tidak terhubung atau menunggu data pertama. Silakan periksa kembali nanti.";
  }
  const freshLabel = freshnessMap[fresh] || "menunggu data";
  const presLabel = preservationMap[preservation] || "menunggu data";

  return `Status sistem saat ini:\n` +
         `• Monitoring: Aktif\n` +
         `• Kesegaran Ikan: ${freshLabel}\n` +
         `• Kondisi Penyimpanan: ${presLabel}\n` +
         `• Suhu Terakhir: ${sensor?.T ?? "-"} °C\n` +
         `• Amonia Terakhir: ${sensor?.mq135_ppm ?? "-"} ppm`;
}

/**
 * (BARU) Fungsi ini HANYA berisi jawaban rule-based lokal
 */
function getLocalResponse(userMessage, cache) {
  const msg = userMessage.toLowerCase().trim();
  const { sensor, fresh, preservation, monitoringStartedAt } = cache;

  // --- Respon Cek Status ---
  if (msg.includes("status") || msg.includes("kabar")) {
    return getStatusResponse(cache);
  }
  if (msg.includes("segar") || msg.includes("kesegaran")) {
    const freshLabel = freshnessMap[fresh] || "belum ada data";
    return `Status kesegaran ikan saat ini adalah: ${freshLabel} (kode: ${fresh || "N/A"}).`;
  }
  if (msg.includes("penyimpanan") || msg.includes("kondisi")) {
    const presLabel = preservationMap[preservation] || "belum ada data";
    return `Status kondisi penyimpanan saat ini adalah: ${presLabel} (kode: ${preservation || "N/A"}).`;
  }

  // --- Respon Cek Sensor Spesifik ---
  if (msg.includes("suhu") || msg.includes("temperatur")) {
    return `Suhu sensor saat ini ${sensor?.T ?? "-"} °C.`;
  }
  if (msg.includes("amonia") || msg.includes("nh3")) {
    return `Kadar gas amonia (NH₃) saat ini ${sensor?.mq135_ppm ?? "-"} ppm.`;
  }
  if (msg.includes("metana") || msg.includes("ch4")) {
    return `Kadar gas metana (CH₄) saat ini ${sensor?.mq2_ppm ?? "-"} ppm.`;
  }
  if (msg.includes("lembap") || msg.includes("humidity") || msg.includes("rh")) {
    return `Kelembaban (RH) saat ini ${sensor?.RH ?? "-"} %.`;
  }
  if (msg.includes("ph")) {
    return `Tingkat pH saat ini ${sensor?.pH ?? "-"} pH.`;
  }

  // --- Respon Umum ---
  if (msg.includes("data lengkap") || msg.includes("semua data")) {
    return `Berikut data sensor lengkap terakhir:\n` +
           `• Amonia (NH₃): ${sensor?.mq135_ppm ?? "-"} ppm\n` +
           `• Metana (CH₄): ${sensor?.mq2_ppm ?? "-"} ppm\n` +
           `• Suhu: ${sensor?.T ?? "-"} °C\n` +
           `• Kelembaban: ${sensor?.RH ?? "-"} %\n` +
           `• pH: ${sensor?.pH ?? "-"} \n\n` +
           `Status AI:\n` +
           `• Kesegaran: ${freshnessMap[fresh] || "N/A"}\n` +
           `• Penyimpanan: ${preservationMap[preservation] || "N/A"}`;
  }
  
  if (msg.includes("durasi") || msg.includes("monitoring")) {
    if (monitoringStartedAt) {
        const durationMs = new Date().getTime() - new Date(monitoringStartedAt).getTime();
        const seconds = Math.floor((durationMs / 1000) % 60);
        const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        return `Sistem telah memonitor selama ${hours} jam, ${minutes} menit, dan ${seconds} detik.`;
    }
    return "Monitoring sedang tidak aktif atau menunggu data pertama masuk.";
  }

  // --- Respon Fungsionalitas Dashboard ---
  if (msg.includes("dashboard")) {
    return "Dashboard ini adalah antarmuka untuk memonitor kesegaran ikan secara real-time. Anda bisa melihat status koneksi, klasifikasi AI (kesegaran & penyimpanan), dan data sensor langsung seperti amonia, metana, suhu, dan kelembaban.";
  }
  if (msg.includes("klasifikasi ai") || msg.includes("ai decision")) {
    return "Bagian 'Klasifikasi AI' menunjukkan hasil analisis dari mikrokontroler STM32 yang menggunakan Fuzzy Logic. Ini memberikan kesimpulan 'Kesegaran Ikan' (berdasarkan gas amonia & metana) dan 'Kondisi Penyimpanan' (berdasarkan suhu & kelembaban).";
  }
  if (msg.includes("fuzzy logic")) {
     return "Sistem ini menggunakan Fuzzy Logic yang berjalan di mikrokontroler STM32. 'Kesegaran' dihitung dari kadar gas (NH₃ & CH₄), dan 'Penyimpanan' dievaluasi dari suhu dan kelembaban.";
  }
  if (msg.includes("live data") || msg.includes("data sensor real-time")) {
    return "Bagian 'Data Sensor Real-time' menampilkan nilai sensor terkini yang dikirim dari perangkat. Ini mencakup Amonia (NH₃), Metana (CH₄), Suhu, dan Kelembaban, lengkap dengan grafik histori 10 data terakhir.";
  }
  if (msg.includes("riwayat") || msg.includes("history")) {
    return "Halaman 'Riwayat' berisi tabel histori atau catatan dari semua hasil klasifikasi AI (Kesegaran dan Penyimpanan) yang telah disimpan ke database. Anda bisa melihat data yang lalu di sana.";
  }
  if (msg.includes("koneksi")) {
    return "Kartu 'Status Koneksi' di bagian atas dashboard menunjukkan apakah browser Anda saat ini terhubung ke server backend (via Socket.IO) untuk menerima data live. Anda juga bisa menyambung atau memutus koneksi secara manual.";
  }

  if (msg.includes("terima kasih") || msg.includes("thanks")) {
    return "Sama-sama! Senang bisa membantu.";
  }
  
  // --- Respon Default ---
  // Jika tidak ada yang cocok, kembalikan ID khusus
  return DEFAULT_RESPONSE_ID;
}


/**
 * (BARU) Fungsi untuk memanggil LLM (OpenRouter)
 */
async function getLLMResponse(userMessage, cache) {
  const { sensor, fresh, preservation, monitoringStartedAt } = cache;

  // 1. Buat Konteks Data Saat Ini untuk LLM
  const freshLabel = freshnessMap[fresh] || "N/A";
  const presLabel = preservationMap[preservation] || "N/A";
  const monitoringStatus = monitoringStartedAt ? `Aktif sejak ${new Date(monitoringStartedAt).toLocaleString("id-ID")}` : "Tidak Aktif";

  const systemContext = `
Anda adalah asisten AI untuk dashboard IoT "Fish Monitor".
Tugas Anda adalah menjawab pertanyaan pengguna tentang dashboard atau data monitoring ikan.

KONTEKS DASHBOARD:
- Halaman utama (Dashboard): Menampilkan status koneksi, klasifikasi AI, dan data sensor live.
- Halaman Riwayat: Menampilkan tabel histori hasil klasifikasi.
- Klasifikasi AI: Menggunakan Fuzzy Logic di STM32 untuk menentukan 'Kesegaran Ikan' (dari gas NH₃ & CH₄) dan 'Kondisi Penyimpanan' (dari Suhu & Kelembaban).
- Data Sensor Live: Menampilkan grafik 10 data terakhir untuk Amonia (ppm), Metana (ppm), Suhu (°C), dan Kelembaban (%RH).

DATA REAL-TIME SAAT INI (Gunakan data ini untuk menjawab):
- Status Monitoring: ${monitoringStatus}
- Hasil Kesegaran (AI): ${freshLabel} (Kode: ${fresh || "N/A"})
- Hasil Penyimpanan (AI): ${presLabel} (Kode: ${preservation || "N/A"})
- Data Sensor Terakhir:
  - Amonia (NH₃): ${sensor?.mq135_ppm ?? "-"} ppm
  - Metana (CH₄): ${sensor?.mq2_ppm ?? "-"} ppm
  - Suhu: ${sensor?.T ?? "-"} °C
  - Kelembaban: ${sensor?.RH ?? "-"} %
  - pH: ${sensor?.pH ?? "-"}

Jawab pertanyaan pengguna berdasarkan konteks ini. Jika pertanyaan di luar konteks (misal: "resep ikan bakar"), jawab dengan sopan bahwa Anda hanya fokus pada data monitoring. Selalu gunakan Bahasa Indonesia.
`;

  const API_KEY = process.env.OPENROUTER_API_KEY;
  const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo";
  const REFERER = process.env.PROJECT_URL || "http://localhost:3000";

  if (!API_KEY || API_KEY === "sk-or-your-key-here") {
    console.error("❌ OPENROUTER_API_KEY not set.");
    return "Maaf, layanan AI sedang tidak terkonfigurasi. Silakan hubungi administrator.";
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "HTTP-Referer": REFERER,
        "X-Title": "Fish Monitor Webapp", // Opsional, untuk dashboard OpenRouter Anda
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemContext },
          { role: "user", content: userMessage }
        ]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ OpenRouter API error (${response.status}): ${errorBody}`);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error("❌ Gagal menghubungi OpenRouter:", error);
    return "Maaf, saya tidak dapat terhubung ke layanan AI saat ini. Coba beberapa saat lagi.";
  }
}

/**
 * (DIMODIFIKASI) Fungsi utama yang diekspor
 * Sekarang menjadi async
 */
async function getChatResponse(userMessage, cache) {
  // 1. Coba dapatkan jawaban dari logika lokal dulu
  const localResponse = getLocalResponse(userMessage, cache);

  // 2. Jika logika lokal TIDAK menemukan jawaban (mengembalikan ID default)
  if (localResponse === DEFAULT_RESPONSE_ID) {
    console.log("-> (Lokal tidak ditemukan) Menggunakan LLM (OpenRouter) untuk menjawab...");
    // Panggil LLM dengan konteks
    return await getLLMResponse(userMessage, cache);
  }

  // 3. Jika logika lokal BISA menjawab
  console.log("-> Menggunakan jawaban rule-based lokal.");
  return localResponse;
}

module.exports = {
  getChatResponse,
};