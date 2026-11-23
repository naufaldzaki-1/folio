// Validasi input autentikasi: email, nama, dan password.

export function validateEmail(rawEmail: string): { valid: boolean; error?: string; email: string } {
  const email = (rawEmail ?? "").trim().toLowerCase();
  if (!email) {
    return { valid: false, error: "Email wajib diisi.", email };
  }
  if (email.length > 254) {
    return { valid: false, error: "Alamat email terlalu panjang (maksimal 254 karakter).", email };
  }

  // Regex format email standar RFC 5322
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Format email tidak valid. Masukkan alamat email yang benar (contoh: nama@gmail.com).", email };
  }

  const parts = email.split("@");
  if (parts.length !== 2) {
    return { valid: false, error: "Format email tidak valid.", email };
  }

  const [, domain] = parts;
  const domainParts = domain.split(".");
  if (domainParts.length < 2) {
    return { valid: false, error: "Domain email tidak lengkap. Pastikan menyertakan ekstensi domain (contoh: .com, .id).", email };
  }

  const tld = domainParts[domainParts.length - 1];
  if (!/^[a-zA-Z]{2,}$/.test(tld)) {
    return { valid: false, error: "Ekstensi domain email tidak valid.", email };
  }

  // Tolak domain tiruan/dummy yang jelas bukan email nyata
  const blockedDomains = ["fake.com", "dummy.com", "asal.com", "sembarangan.com"];
  if (blockedDomains.includes(domain)) {
    return { valid: false, error: "Silakan gunakan alamat email aktif yang sebenarnya (bukan domain uji coba).", email };
  }

  return { valid: true, email };
}

export function validateName(rawName: string): { valid: boolean; error?: string; name: string } {
  const name = (rawName ?? "").trim();
  if (!name || name.length < 2) {
    return { valid: false, error: "Nama lengkap minimal 2 karakter.", name };
  }
  if (name.length > 100) {
    return { valid: false, error: "Nama lengkap maksimal 100 karakter.", name };
  }
  if (!/[a-zA-Z]/.test(name)) {
    return { valid: false, error: "Nama lengkap harus memuat huruf.", name };
  }
  return { valid: true, name };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: "Password minimal 8 karakter." };
  }
  if (password.length > 128) {
    return { valid: false, error: "Password maksimal 128 karakter." };
  }
  return { valid: true };
}
