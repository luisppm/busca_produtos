const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const routes = require('./routes');
const database = require('./config/db/database');
const app = express();
const cors = require('cors');

const startedAt = Date.now();

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(routes);

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Busca Produtos API</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #f8fafc; color: #1e293b; }
                h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
                .card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                .form-group { margin-bottom: 15px; }
                label { display: block; margin-bottom: 6px; font-weight: 600; }
                input[type="text"] { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 16px; box-sizing: border-box; }
                button { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: 600; }
                button:hover { background: #1d4ed8; }
                pre { background: #0f172a; color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 14px; }
                .badge { display: inline-block; padding: 4px 8px; background: #e0f2fe; color: #0369a1; border-radius: 4px; font-size: 12px; font-weight: 600; }
            </style>
        </head>
        <body>
            <h1>Busca Produtos API <span class="badge">Ativo</span></h1>
            <div class="card">
                <h2>Consultar Produto por Código de Barras</h2>
                <form id="searchForm">
                    <div class="form-group">
                        <label for="barcode">Código de Barras (GTIN/EAN):</label>
                        <input type="text" id="barcode" placeholder="Ex: 7891000100103" value="7891000100103" required>
                    </div>
                    <button type="submit">Consultar Produto</button>
                </form>
            </div>
            <div class="card" id="resultCard" style="display: none;">
                <h2>Resultado</h2>
                <pre id="resultOutput"></pre>
            </div>

            <script>
                document.getElementById('searchForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const barcode = document.getElementById('barcode').value.trim();
                    const resultCard = document.getElementById('resultCard');
                    const resultOutput = document.getElementById('resultOutput');
                    
                    resultCard.style.display = 'block';
                    resultOutput.textContent = 'Consultando...';

                    try {
                        const res = await fetch('/product_consult?barcode=' + encodeURIComponent(barcode));
                        const data = await res.json();
                        resultOutput.textContent = JSON.stringify(data, null, 2);
                    } catch (err) {
                        resultOutput.textContent = 'Erro ao conectar com a API: ' + err.message;
                    }
                });
            </script>
        </body>
        </html>
    `);
});

app.get('/status', async (req, res) => res.json ({
    uptime: Date.now() - startedAt 
}));

function queryDb(sql, params) {
    return new Promise((resolve, reject) => {
        database.connection.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

app.get('/product_consult', async (req, res) => {
    console.log('Consultar produto: ', req.query.barcode);
    const { barcode } = req.query;

    if (!barcode) {
        return res.status(400).json({ error: 'Código de barras obrigatório' });
    }

    try {
        // 1. Verificar se o produto já existe no banco de dados
        const selectQuery = 'SELECT * FROM product WHERE bar_code = ?';
        let dbResults = [];
        try {
            const results = await queryDb(selectQuery, [barcode]);
            dbResults = Array.isArray(results) ? results : [];
        } catch (dbErr) {
            console.warn('Erro ao consultar banco de dados:', dbErr.message);
        }

        if (dbResults.length > 0) {
            console.log('Produto encontrado no banco de dados!');
            const dbProduct = dbResults[0];
            return res.status(200).json({
                source: 'database',
                gtin: dbProduct.bar_code,
                description: dbProduct.name,
                thumbnail: dbProduct.url_image,
                barcode_image: dbProduct.barcode_image,
                brand: { name: dbProduct.brand_name },
                category: { description: dbProduct.category_description },
                gtins: [{
                    gtin: Number(dbProduct.bar_code),
                    commercial_unit: {
                        type_packaging: dbProduct.commercial_unit_type_packaging,
                        quantity_packaging: dbProduct.commercial_unit_quantity_packaging
                    }
                }],
                raw_db: dbProduct
            });
        }

        // 2. Se não existir no banco, consultar na API externa api.cosmos
        console.log('Produto não encontrado no banco de dados. Consultando API Cosmos...');
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://api.cosmos.bluesoft.com.br/gtins/' + barcode,
            headers: { 
                'X-Cosmos-Token': 'n0YI5YvntVXUjSuPeO2Hug'
            }
        };

        const response = await axios.request(config);

        // 3. Inserir produto retornado no banco de dados
        const insertQuery = "INSERT INTO product (bar_code, name, url_image, commercial_unit_type_packaging, commercial_unit_quantity_packaging, barcode_image, brand_name, category_description, hash, dt_create, id_category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        const barCode = response.data.gtin || barcode;
        const name = response.data.description || '';
        const url_image = response.data.thumbnail || '';
        const gtins = Array.isArray(response.data.gtins) ? response.data.gtins.find(item => item.gtin === Number(barcode)) : null;

        const commercial_unit_type_packaging = (gtins && gtins.commercial_unit) ? gtins.commercial_unit.type_packaging : null;
        const commercial_unit_quantity_packaging = (gtins && gtins.commercial_unit) ? gtins.commercial_unit.quantity_packaging : null;
        const barcode_image = response.data.barcode_image || '';
        const brand_name = response.data.brand ? response.data.brand.name : '';
        const category_description = response.data.category ? response.data.category.description : '';
        const dtCreate = new Date();
        const idCategory = 1;

        const stringHash = `${barCode}|${name}|${url_image}|${commercial_unit_type_packaging}|${commercial_unit_quantity_packaging}|${barcode_image}|${brand_name}|${category_description}`;
        const hash = crypto.createHash('md5').update(stringHash).digest('hex');

        try {
            await queryDb(insertQuery, [
                barCode, name, url_image, commercial_unit_type_packaging,
                commercial_unit_quantity_packaging, barcode_image, brand_name,
                category_description, hash, dtCreate, idCategory
            ]);
            console.log('Registro inserido no banco de dados!');
        } catch (insertErr) {
            console.error('Erro ao salvar produto no banco de dados:', insertErr.message);
        }

        return res.status(200).json(response.data);

    } catch (error) {
        if (error.response && error.response.status === 404){
            console.log(`Produto ${barcode} não encontrado na API Cosmos`);
            return res.status(404).json(error.response.data || { error: 'Produto não encontrado' });
        } else {
            console.error('Erro ao consultar produto:', error.message);
            return res.status(500).json({ error: 'Erro ao consultar serviço de produtos', message: error.message });
        }
    }
});

const server = app.listen(3000, '0.0.0.0', () => {
    console.log("Servidor rodando na porta 3000 (0.0.0.0)");
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error('Porta 3000 já está em uso.');
    } else {
        console.error('Erro no servidor:', err);
    }
});


