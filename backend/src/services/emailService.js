import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

class EmailService {
  constructor() {
    this.transporter = null;
    this.useSendGrid = false;
    this.init();
  }

  async init() {
    try {
      console.log('🚀 Iniciando EmailService...');
      console.log('📧 SENDGRID_API_KEY disponível:', !!process.env.SENDGRID_API_KEY);
      console.log('📧 EMAIL_USER disponível:', !!process.env.EMAIL_USER);
      
      // PRIORIDADE 1: Tentar SendGrid se configurado
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'SG.COLOQUE_SUA_API_KEY_AQUI') {
        console.log('🚀 Configurando SendGrid (prioridade)...');
        try {
          sgMail.setApiKey(process.env.SENDGRID_API_KEY);
          this.useSendGrid = true;
          console.log('✅ SendGrid configurado com sucesso!');
          return;
        } catch (error) {
          console.error('❌ Erro ao configurar SendGrid:', error.message);
        }
      }
      
      // FALLBACK: Gmail SMTP (para desenvolvimento)
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_PASS !== 'sua_senha_de_app_aqui') {
        console.log('📧 Fallback: Configurando Gmail SMTP...');
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
      } else {
        // Use Ethereal para teste (email de desenvolvimento)
        console.log('🧪 Configurando Ethereal (email de teste) para desenvolvimento...');
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        
        console.log('📧 Credenciais de teste criadas:');
        console.log('   User:', testAccount.user);
        console.log('   Pass:', testAccount.pass);
      }
      
      // Verificar conexão
      await this.transporter.verify();
      console.log('✅ Conexão de email estabelecida com sucesso!');
    } catch (error) {
      console.error('❌ Erro na conexão de email:', error.message);
    }
  }

  async sendMail(mailOptions) {
    try {
      // Se usar SendGrid
      if (this.useSendGrid) {
        console.log('📧 Enviando via SendGrid API...');
        
        const msg = {
          to: mailOptions.to,
          from: {
            email: process.env.EMAIL_USER || 'kralinfo18@gmail.com',
            name: 'e-Prontuário Aliança-PE'
          },
          subject: mailOptions.subject,
          html: mailOptions.html,
        };
        
        console.log('📧 Dados do email:', { to: msg.to, from: msg.from.email, subject: msg.subject });
        
        const response = await sgMail.send(msg);
        console.log('✅ Email enviado via SendGrid! Status:', response[0].statusCode);
        
        return { messageId: response[0].headers['x-message-id'] || 'sendgrid-success' };
      }
      
      // Fallback: SMTP
      if (!this.transporter) {
        throw new Error('Nenhum método de envio disponível');
      }

      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        ...mailOptions
      });

      console.log('📧 Email enviado via SMTP:', info.messageId);
      
      return info;
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error.message);
      if (error.response && error.response.body) {
        console.error('📝 Detalhes do erro:', JSON.stringify(error.response.body, null, 2));
      }
      throw error;
    }
  }

  async sendPasswordResetEmail(email, resetToken, userName) {
    // Verificar se há pelo menos um método de envio disponível
    if (!this.useSendGrid && !this.transporter) {
      throw new Error('Nenhum método de envio de email configurado');
    }

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      to: email,
      subject: 'Recuperação de Senha - e-Prontuário',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #667eea; margin: 0;">e-Prontuário</h1>
            <p style="color: #7f8c8d; margin: 5px 0;">Aliança-PE - Sistema de Gerenciamento</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #667eea;">
            <h2 style="color: #2c3e50; margin-top: 0;">Recuperação de Senha</h2>
            <p style="color: #34495e; line-height: 1.6;">
              Olá <strong>${userName}</strong>,
            </p>
            <p style="color: #34495e; line-height: 1.6;">
              Recebemos uma solicitação para redefinir a senha da sua conta no e-Prontuário. 
              Se você fez esta solicitação, clique no botão abaixo para criar uma nova senha.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        font-weight: bold; 
                        display: inline-block;">
                Redefinir Senha
              </a>
            </div>
            
            <p style="color: #7f8c8d; font-size: 14px; line-height: 1.5;">
              Este link é válido por <strong>1 hora</strong> e pode ser usado apenas uma vez.
            </p>
            
            <p style="color: #7f8c8d; font-size: 14px; line-height: 1.5;">
              Se você não solicitou esta alteração, pode ignorar este email com segurança. 
              Sua senha atual permanece inalterada.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;">
            
            <p style="color: #95a5a6; font-size: 12px; text-align: center;">
              Este é um email automático. Por favor, não responda a esta mensagem.<br>
              Se você está tendo problemas com o botão acima, copie e cole o link abaixo no seu navegador:<br>
              <span style="word-break: break-all;">${resetLink}</span>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #95a5a6; font-size: 12px;">
            © 2025 Aliança-PE. Todos os direitos reservados.
          </div>
        </div>
      `
    };

    try {
      const info = await this.sendMail(mailOptions);
      console.log('✅ Email de recuperação enviado:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Erro ao enviar email de recuperação:', error);
      throw error;
    }
  }
}

// Instância singleton
const emailService = new EmailService();

export default emailService;
