import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.serve(async (req) => {
  try {
    console.log("Fungsi dimulai...");

    // 1. Ambil data peminjaman, TAMBAHKAN kolom 'reject_reason'
    const { data: loans, error } = await supabase
      .from('loans')
      .select(`
        borrowed_at,
        reject_reason, 
        profiles:user_id (full_name, phone_number),
        variants:variant_id (items:item_id (name))
      `)
      .eq('status', 'dipinjam'); // Kita ambil yg statusnya kembali jadi 'dipinjam' (termasuk yg ditolak)

    if (error) {
        console.error("Database Error:", error);
        throw error;
    }
    
    console.log(`Ditemukan ${loans?.length || 0} data peminjaman.`);

    if (!loans || loans.length === 0) {
      return new Response(JSON.stringify({ message: "Tidak ada peminjaman aktif." }), { headers: { "Content-Type": "application/json" } });
    }

    const reminders = new Map();
    
    // 2. Grouping Data per Nomor HP
    loans.forEach(loan => {
      let phone = loan.profiles?.phone_number;
      const itemName = loan.variants?.items?.name;
      const rejection = loan.reject_reason; // Ambil alasan penolakan
      
      if (!phone || !itemName) return;

      // FORMATTER NOMOR HP: Ubah 08xx jadi 628xx
      if (phone.startsWith('0')) {
        phone = '62' + phone.slice(1);
      }

      if (!reminders.has(phone)) {
        reminders.set(phone, {
          name: loan.profiles.full_name || "Member",
          items: []
        });
      }

      const borrowDate = new Date(loan.borrowed_at).getTime();
      const now = new Date().getTime();
      const diffDays = Math.ceil((now - borrowDate) / (1000 * 3600 * 24));

      // Masukkan data item beserta alasan penolakan (jika ada)
      reminders.get(phone).items.push({ 
        name: itemName, 
        days: diffDays,
        rejectReason: rejection 
      });
    });

    const results = [];

    // 3. Kirim Pesan ke Fonnte
    for (const [phone, data] of reminders) {
      let listBarang = "";
      let maxLate = 0;

      data.items.forEach((it: any) => {
        // --- LOGIKA FORMAT PESAN PER ITEM ---
        let itemLine = `- ${it.name} (${it.days} hari)`;
        
        // Jika ada alasan penolakan, tambahkan ke pesan
        if (it.rejectReason) {
            itemLine += ` ⚠️ [Pengajuan Pengembalian Ditolak] [Alasan: ${it.rejectReason}]`;
        }
        
        listBarang += itemLine + "\n";

        if (it.days > maxLate) maxLate = it.days;
      });

      let message = `Shalom *${data.name}*,\n\nMengingatkan barang Tambourine yang sedang Anda bawa:\n${listBarang}\n`;
      
      if (maxLate > 10) {
        message += `\n⚠️  *PERHATIAN*: Peminjaman sudah melewati batas 10 hari (Total: ${maxLate} hari). Mohon SEGERA dikembalikan ke gudang.`;
      } else {
        message += `\nMohon jangan lupa dibawa besok hari *Minggu* untuk dikembalikan ya. Terima kasih! 🙏`;
      }
      
      message += `\n\n(Pesan Otomatis System)`;

      console.log(`Mengirim ke Fonnte: ${phone}`);

      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 
          'Authorization': FONNTE_TOKEN 
        },
        body: new URLSearchParams({
          'target': phone,
          'message': message,
        })
      });
      
      const resJson = await response.json();
      console.log("Respon Fonnte:", resJson);
      results.push({ phone, status: resJson });
    }

    return new Response(JSON.stringify({ success: true, results }), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err: any) {
    console.error("System Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" } 
    });
  }
})