# Acordos de Processamento de Dados (DPAs) - Terceiros

## LGPD Art. 33-39: Transferencia internacional e operadores de dados

Este documento mapeia todos os servicos de terceiros que processam dados pessoais
no sistema de Prontuario Eletronico e o status de conformidade com a LGPD.

---

## 1. Mapa de Servicos de Terceiros

### 1.1 Render.com (Hospedagem API + Banco de Dados)

| Campo | Detalhe |
|-------|---------|
| **Servico** | Render.com (PaaS - Platform as a Service) |
| **Finalidade** | Hospedagem da API backend e banco de dados PostgreSQL |
| **Dados Processados** | TODOS os dados do sistema: pacientes, atendimentos, usuarios, triagens, consultas |
| **Localizacao** | Oregon, Estados Unidos |
| **Tipo de Transferencia** | Internacional (Brasil -> EUA) |
| **Base Legal** | Art. 7, I (consentimento) + Art. 11 (dados sensiveis de saude) |
| **Status DPA** | ⚠️ PENDENTE - Verificar DPA do Render |
| **Risco** | ALTO - Dados de saude sensivel em servidor nos EUA |

**Acoes Necessarias:**
- [ ] Acessar https://render.com/legal e verificar Terms of Service e DPA
- [ ] Verificar se Render oferece clausulas contratuais padrao para LGPD
- [ ] Avaliar se dados sao criptografados em repouso no Render
- [ ] Considerar migrar para regiao com adequacao LGPD (se disponivel)
- [ ] Documentar avaliacao de impacto da transferencia internacional

**Links Uteis:**
- Terms of Service: https://render.com/legal/terms
- Privacy Policy: https://render.com/legal/privacy

---

### 1.2 Vercel (Hospedagem Frontend)

| Campo | Detalhe |
|-------|---------|
| **Servico** | Vercel Inc. |
| **Finalidade** | Hospedagem da aplicacao Angular frontend |
| **Dados Processados** | Endereco IP, User-Agent, dados de sessao, cookies |
| **Localizacao** | Estados Unidos (regiao de deploy automatica) |
| **Tipo de Transferencia** | Internacional (Brasil -> EUA) |
| **Base Legal** | Art. 7, V (interesse legitimo) |
| **Status DPA** | ⚠️ PENDENTE - Verificar DPA da Vercel |
| **Risco** | MEDIO - Dados de acesso e sessao |

**Acoes Necessarias:**
- [ ] Verificar DPA da Vercel: https://vercel.com/legal/data-processing-addendum
- [ ] Verificar quais dados sao coletados via Analytics/Logs
- [ ] Avaliar se cookies sao configurados com consentimento adequado
- [ ] Documentar avaliacao de impacto

**Links Uteis:**
- Vercel DPA: https://vercel.com/legal/data-processing-addendum
- Vercel Privacy: https://vercel.com/legal/privacy-policy

---

### 1.3 SendGrid (Envio de Emails Transacionais)

| Campo | Detalhe |
|-------|---------|
| **Servico** | SendGrid (Twilio Inc.) |
| **Finalidade** | Envio de emails de recuperacao de senha e notificacoes |
| **Dados Processados** | Nome e email do usuario, conteudo dos emails |
| **Localizacao** | Estados Unidos |
| **Tipo de Transferencia** | Internacional (Brasil -> EUA) |
| **Base Legal** | Art. 7, II (contratual) |
| **Status DPA** | ⚠️ PENDENTE - Verificar DPA do SendGrid/Twilio |
| **Risco** | BAIXO - Apenas dados de contato |

**Acoes Necessarias:**
- [ ] Verificar DPA do SendGrid: https://sendgrid.com/policies/dpa/
- [ ] Verificar se SendGrid oferece subprocessors list
- [ ] Avaliar se emails contem dados sensiveis de saude (nao devem)
- [ ] Documentar avaliacao de impacto

**Links Uteis:**
- SendGrid DPA: https://sendgrid.com/policies/dpa/
- SendGrid Privacy: https://sendgrid.com/policies/privacy/

---

### 1.4 Gmail SMTP (Fallback para Emails)

| Campo | Detalhe |
|-------|---------|
| **Servico** | Google LLC (Gmail SMTP) |
| **Finalidade** | Envio de emails de recuperacao de senha (fallback) |
| **Dados Processados** | Nome, email do usuario, conteudo dos emails |
| **Localizacao** | Servidores Google (global) |
| **Tipo de Transferencia** | Internacional (Brasil -> Global) |
| **Base Legal** | Art. 7, II (contratual) |
| **Status DPA** | ⚠️ PENDENTE - Google Workspace DPA |
| **Risco** | BAIXO - Apenas dados de contato |

**Acoes Necessarias:**
- [ ] Verificar se conta Gmail pessoal ou Workspace (DPA diferente)
- [ ] Google Workspace DPA: https://cloud.google.com/security/compliance/dpa
- [ ] Considerar migrar para servico de email dedicado com DPA claro
- [ ] Avaliar uso de Google Apps Password e implicacoes de seguranca

---

## 2. Transferencia Internacional de Dados

### 2.1 Paises Envolvidos

| Pais | Adequacao LGPD | Servicos |
|------|---------------|----------|
| Brasil | ✅ Origem | Todos os dados originais |
| Estados Unidos (Oregon) | ⚠️ Sem decisao de adequacao | Render, Vercel, SendGrid |
| Global (Google) | ⚠️ Sem decisao de adequacao | Gmail SMTP |

### 2.2 Bases Legais para Transferencia (Art. 33-36)

A LGPD permite transferencia internacional nas seguintes situacoes (Art. 33):

- [ ] **Art. 33, I**: Pais com nivel adequado de protecao (nenhum dos EUA tem)
- [ ] **Art. 33, II**: Clausulas contratuais padrao (verificar com cada provedor)
- [ ] **Art. 33, III**: Selos de certificacao (verificar com cada provedor)
- [x] **Art. 33, VII**: Consentimento do titular (obter via termo de consentimento)
- [ ] **Art. 33, VIII**: Interesse legitimo do controlador (documentar)

### 2.3 Acoes para Conformidade

- [ ] Obter consentimento especifico para transferencia internacional no cadastro
- [ ] Incluir na Politica de Privacidade quais dados sao transferidos e para onde
- [ ] Documentar clausulas contratuais com cada provedor (DPAs)
- [ ] Avaliar necessidade de Avaliacao de Impacto a Protecao de Dados (AIPD/DPIA)

---

## 3. Checklist Geral de DPAs

| Provedor | DPA Verificado? | Clusulas LGPD? | Subprocessors? | Risco | Prioridade |
|----------|----------------|----------------|----------------|-------|------------|
| Render.com | ❌ Nao | ❌ Nao | ❌ Nao | ALTO | URGENTE |
| Vercel | ❌ Nao | ❌ Nao | ❌ Nao | MEDIO | ALTA |
| SendGrid | ❌ Nao | ❌ Nao | ❌ Nao | BAIXO | MEDIA |
| Gmail SMTP | ❌ Nao | ❌ Nao | ❌ Nao | BAIXO | MEDIA |

---

## 4. Proximos Passos

1. **URGENTE**: Acessar pagina legal de cada provedor e verificar status do DPA
2. **URGENTE**: Documentar quais provedores oferecem conformidade com LGPD
3. **ALTA**: Incluir clausula na Politica de Privacidade sobre transferencia internacional
4. **ALTA**: Obter consentimento do usuario para transferencia internacional
5. **MEDIA**: Avaliar migrar para provedores com data centers no Brasil (AWS Sao Paulo, Azure Brasil)
6. **MEDIA**: Realizar Avaliacao de Impacto (DPIA) para transferencia de dados de saude

---

## 5. Referencias LGPD

- Art. 5, VI: Definicao de operador de dados
- Art. 5, X: Definicao de controlador
- Art. 33: Condicoes para transferencia internacional
- Art. 34: Autoridade nacional como base para transferencia
- Art. 37: Operadores e suboperadores devem ser documentados
- Art. 39: Agente de tratamento deve ser identificado

---

*Documento criado em: 2026-04-08*
*Ultima atualizacao: 2026-04-08*
*Responsavel: Equipe de desenvolvimento E-Prontuario*
