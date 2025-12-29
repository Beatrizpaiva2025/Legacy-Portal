# Plano de Implementação: Sistema de Verificação por QR Code

## Resumo
Sistema que permite verificar autenticidade de traduções certificadas através de QR Code escaneável.

---

## PARTE 1: FRONTEND - Onde está o código atual

### Arquivo Principal
**`/home/user/Legacy-Portal/frontend/src/AdminApp.js`**

### Função que gera o Statement of Authenticity
**Linha ~3748**: `generateAuthenticityStatementHtml()`

```javascript
// Esta função gera o HTML do Statement of Authenticity
// Atualmente o QR Code é apenas visual (placeholder)
const generateAuthenticityStatementHtml = (config = {}) => {
  // ...
  const verificationCode = generateVerificationCode(); // Gera código tipo XXXX-XXXX-XXXX-XXXX
  const verificationUrl = `https://portal.legacytranslations.com/verify/${verificationCode}`;
  // ...
}
```

### Onde o QR Code é renderizado (placeholder atual)
**Linha ~3843-3853**:
```html
<!-- QR Code -->
<div style="text-align: center; margin: 40px 0;">
    <div style="display: inline-block;">
        <div style="width: 120px; height: 120px; border: 2px solid #1a365d; ...">
            <div style="font-size: 8px; ...">
                QR CODE<br/>
                <span style="font-size: 7px;">Scan to verify</span>
            </div>
        </div>
        <div style="font-size: 10px; ...">Scan to verify authenticity</div>
    </div>
</div>
```

---

## PARTE 2: O QUE IMPLEMENTAR

### 2.1 Backend - Novo Endpoint e Model

**Arquivo:** `/home/user/Legacy-Portal/app.py` (ou criar novo arquivo de rotas)

#### Criar Model/Schema para Verificações:
```python
# Tabela: document_verifications
{
    "id": "UUID",
    "verification_code": "XXXX-XXXX-XXXX-XXXX",  # Código único
    "order_number": "P1234",
    "document_type": "Birth Certificate",
    "source_language": "Portuguese",
    "target_language": "English",
    "translator_name": "Beatriz Paiva",
    "translation_date": "2024-12-29",
    "document_hash": "A1B2C3D4...",  # Hash SHA-256 do documento
    "created_at": "timestamp",
    "is_valid": true
}
```

#### Criar Endpoints:

```python
# POST /api/verifications/create
# Chamado quando o tradutor gera o pacote final
@app.route('/api/verifications/create', methods=['POST'])
def create_verification():
    data = request.json
    verification_code = generate_unique_code()
    # Salvar no banco
    # Retornar verification_code e URL

# GET /api/verify/<code>
# Endpoint público - não requer autenticação
@app.route('/api/verify/<code>', methods=['GET'])
def verify_document(code):
    # Buscar no banco pelo código
    # Retornar dados do documento ou "não encontrado"
```

### 2.2 Frontend - Gerar QR Code Real

#### Instalar biblioteca:
```bash
cd frontend
npm install qrcode.react
# ou usar CDN para gerar no HTML
```

#### Opção 1: Usar biblioteca React
```javascript
import QRCode from 'qrcode.react';

// No componente:
<QRCode
  value={verificationUrl}
  size={120}
  level="M"
/>
```

#### Opção 2: Gerar QR como imagem base64 (para HTML estático)
```javascript
import QRCode from 'qrcode';

// Gerar base64
const generateQRCode = async (url) => {
  const qrDataUrl = await QRCode.toDataURL(url, { width: 120 });
  return qrDataUrl; // retorna: data:image/png;base64,...
};

// No HTML:
<img src="${qrDataUrl}" alt="QR Code" style="width: 120px; height: 120px;" />
```

### 2.3 Frontend - Página Pública de Verificação

**Criar novo componente:** `/home/user/Legacy-Portal/frontend/src/VerifyPage.js`

```javascript
// Página pública (sem login) que mostra resultado da verificação
// URL: /verify/XXXX-XXXX-XXXX-XXXX

const VerifyPage = () => {
  const { code } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/verify/${code}`)
      .then(res => res.json())
      .then(data => {
        setResult(data);
        setLoading(false);
      });
  }, [code]);

  if (loading) return <div>Verificando...</div>;

  if (!result.found) {
    return (
      <div className="error">
        ❌ Documento não encontrado
        <p>O código de verificação não existe em nosso sistema.</p>
      </div>
    );
  }

  return (
    <div className="success">
      ✅ Documento Verificado
      <p><strong>Pedido:</strong> {result.order_number}</p>
      <p><strong>Tipo:</strong> {result.document_type}</p>
      <p><strong>Idiomas:</strong> {result.source_language} → {result.target_language}</p>
      <p><strong>Tradutor:</strong> {result.translator_name}</p>
      <p><strong>Data:</strong> {result.translation_date}</p>
      <p><strong>Hash:</strong> {result.document_hash}</p>
    </div>
  );
};
```

### 2.4 Rota no React Router

**Arquivo:** `/home/user/Legacy-Portal/frontend/src/App.js`

```javascript
// Adicionar rota pública
<Route path="/verify/:code" element={<VerifyPage />} />
```

---

## PARTE 3: FLUXO COMPLETO

```
1. Tradutor clica "Download Package" ou "Quick Package"
                    ↓
2. Frontend chama POST /api/verifications/create
   - Envia: order_number, document_type, languages, translator, date
                    ↓
3. Backend gera código único (XXXX-XXXX-XXXX-XXXX)
   - Salva no banco de dados
   - Retorna: verification_code, verification_url
                    ↓
4. Frontend gera QR Code real com a URL
   - URL: https://legacytranslations.com/verify/XXXX-XXXX-XXXX-XXXX
                    ↓
5. QR Code é inserido no PDF/documento
                    ↓
6. Cliente recebe documento, escaneia QR Code
                    ↓
7. Abre página pública /verify/XXXX-XXXX-XXXX-XXXX
                    ↓
8. Página mostra: "✅ Documento Verificado" + detalhes
```

---

## PARTE 4: ARQUIVOS A MODIFICAR/CRIAR

### Modificar:
| Arquivo | O que fazer |
|---------|-------------|
| `frontend/src/AdminApp.js` | Chamar API para criar verificação, gerar QR real |
| `frontend/src/App.js` | Adicionar rota /verify/:code |
| `app.py` | Adicionar endpoints de verificação |

### Criar:
| Arquivo | Descrição |
|---------|-----------|
| `frontend/src/VerifyPage.js` | Página pública de verificação |
| `models/verification.py` | Model para verificações (se usar SQLAlchemy) |

---

## PARTE 5: BANCO DE DADOS

### Se usar SQLite/PostgreSQL:
```sql
CREATE TABLE document_verifications (
    id SERIAL PRIMARY KEY,
    verification_code VARCHAR(20) UNIQUE NOT NULL,
    order_number VARCHAR(50),
    document_type VARCHAR(100),
    source_language VARCHAR(50),
    target_language VARCHAR(50),
    translator_name VARCHAR(100),
    translation_date DATE,
    document_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_verification_code ON document_verifications(verification_code);
```

### Se usar MongoDB:
```javascript
// Collection: verifications
{
  verification_code: "XXXX-XXXX-XXXX-XXXX",
  order_number: "P1234",
  document_type: "Birth Certificate",
  source_language: "Portuguese",
  target_language: "English",
  translator_name: "Beatriz Paiva",
  translation_date: ISODate("2024-12-29"),
  document_hash: "A1B2C3D4...",
  created_at: ISODate(),
  is_valid: true
}
```

---

## PARTE 6: CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Instalar biblioteca QR Code: `npm install qrcode`
- [ ] Criar tabela/collection no banco de dados
- [ ] Criar endpoint POST `/api/verifications/create`
- [ ] Criar endpoint GET `/api/verify/:code`
- [ ] Criar componente `VerifyPage.js`
- [ ] Adicionar rota pública no React Router
- [ ] Modificar `generateAuthenticityStatementHtml()` para:
  - [ ] Chamar API para criar verificação
  - [ ] Gerar QR Code real com biblioteca
  - [ ] Inserir imagem do QR no documento
- [ ] Testar fluxo completo
- [ ] Deploy

---

## NOTAS IMPORTANTES

1. **Segurança**: O endpoint `/api/verify/:code` deve ser PÚBLICO (sem autenticação)
2. **Código único**: Usar UUID ou código aleatório difícil de adivinhar
3. **HTTPS**: O site precisa ter SSL para o QR Code funcionar em celulares
4. **Design**: A página de verificação deve ter visual profissional com logo da empresa

---

## TEMPO ESTIMADO
- Backend (endpoints + banco): ~2 horas
- Frontend (QR + página): ~2 horas
- Testes + ajustes: ~1 hora
- **Total: ~5 horas**

---

*Documento criado em: 29/12/2024*
*Para implementação futura do sistema de verificação por QR Code*
