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
          // Não retorna aqui: continua para configurar Gmail como fallback
        } catch (error) {
          console.error('❌ Erro ao configurar SendGrid:', error.message);
        }
      }
      
      // FALLBACK: Gmail SMTP (sempre inicializado se credenciais disponíveis)
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_PASS !== 'sua_senha_de_app_aqui') {
        console.log('📧 Configurando Gmail SMTP como fallback...');
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
        await this.transporter.verify();
        console.log('✅ Gmail SMTP configurado com sucesso!');
      } else if (!this.useSendGrid) {
        // Só usa Ethereal se não tiver nem SendGrid nem Gmail
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
        await this.transporter.verify();
        console.log('✅ Conexão de email estabelecida com sucesso!');
      }
    } catch (error) {
      console.error('❌ Erro na conexão de email:', error.message);
    }
  }

  async sendMail(mailOptions) {
    try {
      // Se usar SendGrid, tentar primeiro
      if (this.useSendGrid) {
        console.log('📧 Tentando SendGrid API...');
        
        try {
          const msg = {
            to: mailOptions.to,
            from: {
              email: 'kralinfo18@gmail.com', // Email verificado no SendGrid
              name: 'e-Prontuário Aliança-PE'
            },
            subject: mailOptions.subject,
            html: mailOptions.html,
          };
          
          console.log('📧 Dados do email:', { to: msg.to, from: msg.from.email, subject: msg.subject });
          
          const response = await sgMail.send(msg);
          console.log('✅ Email enviado via SendGrid! Status:', response[0].statusCode);
          
          return { messageId: response[0].headers['x-message-id'] || 'sendgrid-success' };
        } catch (sgError) {
          console.log('❌ SendGrid falhou, tentando fallback para Gmail SMTP...');
          console.log('📧 Erro SendGrid:', sgError.message);
          
          // Fallback para Gmail SMTP se SendGrid falhar
          if (this.transporter) {
            console.log('📧 Usando Gmail SMTP como fallback...');
            const info = await this.transporter.sendMail({
              from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
              ...mailOptions
            });
            console.log('✅ Email enviado via Gmail SMTP (fallback):', info.messageId);
            return info;
          } else {
            throw sgError; // Se não tem fallback, relança o erro SendGrid
          }
        }
      }
      
      // Se não usar SendGrid, usar SMTP diretamente
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <h1 style="color: #667eea; margin: 0; font-size: 24px;">e-Prontuário</h1>
            <p style="color: #6c757d; margin: 5px 0; font-size: 14px;">Aliança-PE - Sistema de Gerenciamento</p>
          </div>
          
          <div style="padding: 20px; border-left: 4px solid #667eea; background-color: #f8f9fa; margin: 20px 0; border-radius: 4px;">
            <h2 style="color: #333; margin-top: 0; font-size: 20px;">Recuperação de Senha</h2>
            <p style="color: #555; line-height: 1.6; margin: 10px 0;">
              Olá <strong>${userName || 'Usuário'}</strong>,
            </p>
            <p style="color: #555; line-height: 1.6; margin: 10px 0;">
              Você solicitou a recuperação de senha para sua conta no e-Prontuário. 
              Para continuar, clique no botão abaixo:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #667eea; color: #ffffff; padding: 12px 25px; text-decoration: none; 
                        border-radius: 5px; font-weight: 500; display: inline-block; font-size: 16px;">
                Redefinir Senha
              </a>
            </div>
            
            <p style="color: #777; font-size: 14px; line-height: 1.5; margin: 15px 0;">
              <strong>Importante:</strong> Este link é válido por 1 hora.
            </p>
            
            <p style="color: #777; font-size: 14px; line-height: 1.5; margin: 15px 0;">
              Se você não solicitou esta alteração, pode ignorar este email com segurança.
            </p>
          </div>
          
          <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #6c757d; font-size: 12px; margin: 5px 0;">
              Este email foi enviado automaticamente pelo sistema e-Prontuário.
            </p>
            <p style="color: #6c757d; font-size: 12px; margin: 5px 0;">
              © 2025 Aliança-PE. Sistema de Gerenciamento de Saúde.
            </p>
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
