import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.serve(async (req) => {
  try {
    console.log("Fungsi dimulai..."); // LOG 1

    const { data: loans, error } = await supabase
      .from('loans')
      .select(`
        borrowed_at,
        profiles:user_id (full_name, phone_number),
        variants:variant_id (items:item_id (name))
      `)
      .eq('status', 'dipinjam');

    if (error) {
        console.error("Database Error:", error); // LOG ERROR DB
        throw error;
    }
    
    console.log(`Ditemukan ${loans?.length || 0} data peminjaman.`); // LOG 2

    if (!loans || loans.length === 0) {
      return new Response(JSON.stringify({ message: "Tidak ada peminjaman aktif." }), { headers: { "Content-Type": "application/json" } });
    }

    const reminders = new Map();
    
    loans.forEach(loan => {
      let phone = loan.profiles?.phone_number;
      const itemName = loan.variants?.items?.name;
      
      // LOG DEBUG SETIAP ITEM
      console.log(`Cek Item: ${itemName}, HP: ${phone}`);

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
      
      reminders.get(phone).items.push({ name: itemName, days: diffDays });
    });

    const results = [];
    
    for (const [phone, data] of reminders) {
      let listBarang = "";
      let maxLate = 0;

      data.items.forEach((it: any) => {
        listBarang += `- ${it.name} (${it.days} hari)\n`;
        if (it.days > maxLate) maxLate = it.days;
      });

      let message = `Shalom *${data.name}*,\n\nMengingatkan barang Tambourine yang sedang Anda bawa:\n${listBarang}\n`;
      
      if (maxLate > 10) {
        message += `⚠️ *PERHATIAN*: Peminjaman sudah melewati batas 10 hari (Total: ${maxLate} hari). Mohon SEGERA dikembalikan ke gudang.(Balas YA agar nomor tidak terdeteksi sebagai spam)`;
      } else {
        message += `Mohon jangan lupa dibawa besok hari *Minggu* untuk dikembalikan ya. Terima kasih! 🙏 (Balas YA agar nomor tidak terdeteksi sebagai spam)`;
      }

      console.log(`Mengirim ke Fonnte: ${phone}`); // LOG 3

      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 
          'Authorization': FONNTE_TOKEN 
        },
        body: new URLSearchParams({
          'target': phone,
          'message': message,
          // Hapus countryCode agar kita handle manual di atas
        })
      });
      
      const resJson = await response.json();
      console.log("Respon Fonnte:", resJson); // LOG 4
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