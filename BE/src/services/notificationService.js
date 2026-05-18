const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

const logFilePath = path.join(process.cwd(), 'notifications.log');

// Initialize Resend SDK
const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_xxxxxxxxx'
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

/**
 * Append a sent notification to a local audit file for easy developer inspection.
 */
const auditLog = (notification) => {
    try {
        let logs = [];
        if (fs.existsSync(logFilePath)) {
            const fileContent = fs.readFileSync(logFilePath, 'utf8');
            logs = JSON.parse(fileContent || '[]');
        }
        logs.push({
            timestamp: new Date().toISOString(),
            ...notification
        });
        fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2), 'utf8');
    } catch (err) {
        console.error('[Notification Audit Log Error]:', err.message);
    }
};

/**
 * Send an email notification.
 * Uses official Resend SDK if RESEND_API_KEY is configured in .env, otherwise logs a mock email.
 */
const sendEmail = async (to, subject, htmlContent, textContent) => {
    if (resend) {
        try {
            console.log(`[Resend SDK] Mengirim email ke ${to}...`);
            const response = await resend.emails.send({
                from: 'TemanPulih <onboarding@resend.dev>',
                to: [to],
                subject: subject,
                html: htmlContent,
                text: textContent
            });
            
            if (response.error) {
                console.error('[Resend SDK Error]:', response.error);
            } else {
                console.log(`[Resend SDK] Email berhasil dikirim! ID: ${response.data?.id}`);
                return { success: true, provider: 'resend', id: response.data?.id };
            }
        } catch (error) {
            console.error('[Resend SDK Exception]:', error.message);
        }
    }

    // Mock Fallback
    const banner = `
=========================================
            [MOCK EMAIL SENT]            
=========================================
To:      ${to}
Subject: ${subject}
Content: 
${textContent}
=========================================
`;
    console.log(banner);
    auditLog({ type: 'email', recipient: to, subject, content: textContent });
    return { success: true, provider: 'mock' };
};

/**
 * Send a WhatsApp notification.
 * Uses Twilio if TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are configured,
 * otherwise logs a mock WhatsApp.
 */
const sendWhatsApp = async (to, message) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+14155238886'; // Twilio sandbox number

    if (accountSid && authToken) {
        try {
            console.log(`[Twilio] Mengirim WhatsApp ke ${to}...`);
            // Format phone number to E.164 if not already
            let formattedTo = to;
            if (!formattedTo.startsWith('+')) {
                if (formattedTo.startsWith('0')) {
                    formattedTo = '+62' + formattedTo.slice(1);
                } else {
                    formattedTo = '+' + formattedTo;
                }
            }

            const client = require('twilio')(accountSid, authToken);
            const response = await client.messages.create({
                from: `whatsapp:${fromNumber}`,
                to: `whatsapp:${formattedTo}`,
                body: message
            });

            console.log(`[Twilio] WhatsApp berhasil dikirim! SID: ${response.sid}`);
            return { success: true, provider: 'twilio', id: response.sid };
        } catch (error) {
            console.error('[Twilio WhatsApp Error]:', error.message);
        }
    }

    // Mock Fallback
    const banner = `
=========================================
          [MOCK WHATSAPP SENT]          
=========================================
To:      ${to}
Content: 
${message}
=========================================
`;
    console.log(banner);
    auditLog({ type: 'whatsapp', recipient: to, content: message });
    return { success: true, provider: 'mock' };
};

/**
 * Send WhatsApp OTP using pre-approved Twilio Content Template
 * contentSid: 'HX229f5a04fd0510ce1b071852155d3e75'
 * contentVariables: { "1": code }
 */
const sendWhatsAppOTP = async (to, code) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+14155238886';

    if (accountSid && accountSid !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' && authToken && authToken !== 'your_twilio_auth_token_here') {
        try {
            console.log(`[Twilio OTP] Mengirim WhatsApp OTP ke ${to}...`);
            let formattedTo = to;
            if (!formattedTo.startsWith('+')) {
                if (formattedTo.startsWith('0')) {
                    formattedTo = '+62' + formattedTo.slice(1);
                } else {
                    formattedTo = '+' + formattedTo;
                }
            }

            const client = require('twilio')(accountSid, authToken);
            const response = await client.messages.create({
                from: `whatsapp:${fromNumber}`,
                to: `whatsapp:${formattedTo}`,
                contentSid: 'HX229f5a04fd0510ce1b071852155d3e75',
                contentVariables: JSON.stringify({
                    "1": code
                })
            });

            console.log(`[Twilio OTP] WhatsApp OTP terkirim! SID: ${response.sid}`);
            return { success: true, provider: 'twilio', id: response.sid };
        } catch (error) {
            console.error('[Twilio OTP WhatsApp Error]:', error.message);
        }
    }

    // Mock Fallback
    const banner = `
===================================================
            [MOCK WHATSAPP OTP SENT]               
===================================================
To:          ${to}
Template ID: HX229f5a04fd0510ce1b071852155d3e75
Variables:   { "1": "${code}" }
Message:     *${code}* is your verification code. For your security, do not share this code.
===================================================
`;
    console.log(banner);
    auditLog({ 
        type: 'whatsapp_otp', 
        recipient: to, 
        templateId: 'HX229f5a04fd0510ce1b071852155d3e75',
        variables: { "1": code } 
    });
    return { success: true, provider: 'mock' };
};

/**
 * General helper to send verification codes to caregivers or patients.
 */
const sendVerificationCode = async ({ identifier, code, senderName, isEmail }) => {
    const subject = 'Kode Verifikasi Hubungan Keluarga - TemanPulih';
    
    const textContent = `Halo! Anda telah diundang oleh ${senderName} untuk terhubung di aplikasi TemanPulih.

Silakan masukkan kode verifikasi 6-digit berikut di aplikasi Anda untuk menyetujui hubungan ini:

[ ${code} ]

Kode ini bersifat rahasia dan jangan dibagikan kepada siapa pun.`;

    // Render each OTP digit in a beautiful split-input monospaced block for high-end feel
    const digits = code.toString().split('');
    const digitsHtml = digits.map(digit => `
        <div style="display: inline-block; width: 42px; height: 50px; line-height: 50px; text-align: center; background: #FAF8F5; border: 1.5px solid #E2E8F0; border-radius: 12px; font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: 800; color: #C4653A; margin: 0 4px;">
            ${digit}
        </div>
    `).join('');

    const htmlContent = `
        <div style="background-color: #FAF8F5; padding: 40px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid rgba(0, 0, 0, 0.04); border-radius: 24px; box-shadow: 0 16px 32px rgba(15, 23, 42, 0.03); overflow: hidden; position: relative;">
                <!-- Warm copper bento top strip -->
                <div style="height: 5px; background: linear-gradient(90deg, #C4653A, #D0B8A8, #8F9E8B);"></div>
                
                <div style="padding: 44px 32px;">
                    <!-- Brand Header -->
                    <div style="text-align: center; margin-bottom: 32px;">
                        <span style="font-family: inherit; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: -0.03em;">Teman<span style="color: #C4653A;">Pulih</span></span>
                        <p style="color: #64748B; font-size: 13px; font-weight: 500; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">Sinkronisasi Keluarga Aman</p>
                    </div>

                    <!-- Welcome Body -->
                    <div style="margin-bottom: 32px;">
                        <h2 style="color: #0F172A; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 16px 0;">Undangan Hubungan Keluarga</h2>
                        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                            Halo, Anda telah diundang oleh <strong>${senderName}</strong> untuk terhubung sebagai keluarga/pendamping medis di aplikasi <strong>TemanPulih</strong>.
                        </p>
                        
                        <!-- OTP Display Box -->
                        <div style="background-color: rgba(196, 101, 58, 0.02); border: 1px solid rgba(196, 101, 58, 0.08); border-radius: 16px; padding: 28px 16px; text-align: center; margin-bottom: 28px;">
                            <p style="color: #64748B; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 16px 0; font-weight: 700;">Kode Verifikasi Rahasia Anda</p>
                            
                            <div style="margin: 0 auto; display: inline-block;">
                                ${digitsHtml}
                            </div>
                        </div>

                        <!-- Instructions -->
                        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
                            Silakan buka menu <strong>Sinkronisasi Keluarga</strong> pada aplikasi TemanPulih Anda, pilih **Setujui** pada permintaan pending, lalu masukkan 6 digit kode di atas untuk menghubungkan akun secara aman.
                        </p>
                    </div>

                    <!-- Security Alert - Styled with inline vector SVG instead of emoji -->
                    <div style="background-color: #FAF8F5; border-radius: 12px; padding: 16px; margin-bottom: 32px; display: table; width: 100%; box-sizing: border-box;">
                        <div style="display: table-cell; vertical-align: top; width: 24px; padding-right: 12px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4653A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                        </div>
                        <div style="display: table-cell; vertical-align: top;">
                            <p style="color: #64748B; font-size: 12px; line-height: 1.5; margin: 0;">
                                <strong>Pemberitahuan Keamanan:</strong> Menghubungkan akun memberikan hak kepada pendamping Anda untuk memantau konsumsi obat dan data kepatuhan Anda demi proses pemulihan. Jangan pernah membagikan kode verifikasi ini kepada pihak lain.
                            </p>
                        </div>
                    </div>

                    <!-- Divider -->
                    <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 0 0 24px 0;" />

                    <!-- Footnote -->
                    <p style="color: #94A3B8; font-size: 11px; text-align: center; line-height: 1.5; margin: 0;">
                        Email ini dikirim secara otomatis oleh sistem perlindungan keamanan TemanPulih.<br />
                        Jika Anda merasa tidak melakukan tindakan ini, abaikan email ini dengan aman.
                    </p>
                </div>
            </div>
        </div>
    `;

    if (isEmail) {
        return sendEmail(identifier, subject, htmlContent, textContent);
    } else {
        return sendWhatsAppOTP(identifier, code);
    }
};

/**
 * Send a structured WhatsApp Medication Reminder using Twilio Content Template
 * contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e'
 * contentVariables: { "1": medicineName, "2": timeSlot }
 */
const sendMedicationReminderWhatsApp = async (to, medicineName, timeSlot) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+14155238886';

    if (accountSid && accountSid !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' && authToken && authToken !== 'your_twilio_auth_token_here') {
        try {
            console.log(`[Twilio Template] Mengirim WhatsApp pengingat obat ke ${to}...`);
            let formattedTo = to;
            if (!formattedTo.startsWith('+')) {
                if (formattedTo.startsWith('0')) {
                    formattedTo = '+62' + formattedTo.slice(1);
                } else {
                    formattedTo = '+' + formattedTo;
                }
            }

            const client = require('twilio')(accountSid, authToken);
            const response = await client.messages.create({
                from: `whatsapp:${fromNumber}`,
                to: `whatsapp:${formattedTo}`,
                contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
                contentVariables: JSON.stringify({
                    "1": medicineName,
                    "2": timeSlot
                })
            });

            console.log(`[Twilio Template] WhatsApp pengingat obat terkirim! SID: ${response.sid}`);
            return { success: true, provider: 'twilio', id: response.sid };
        } catch (error) {
            console.error('[Twilio Template WhatsApp Error]:', error.message);
        }
    }

    // Mock Fallback
    const banner = `
===================================================
      [MOCK WHATSAPP MEDICATION REMINDER SENT]     
===================================================
To:          ${to}
Template ID: HXb5b62575e6e4ff6129ad7c8efe1f983e
Variables:   { "1": "${medicineName}", "2": "${timeSlot}" }
===================================================
`;
    console.log(banner);
    auditLog({ 
        type: 'medication_reminder', 
        recipient: to, 
        templateId: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
        variables: { "1": medicineName, "2": timeSlot } 
    });
    return { success: true, provider: 'mock' };
};

module.exports = {
    sendEmail,
    sendWhatsApp,
    sendWhatsAppOTP,
    sendVerificationCode,
    sendMedicationReminderWhatsApp
};
