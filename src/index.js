const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const routes = require('./routes');
const database = require('./config/db/database');
const app = express();
const cors = require('cors');

const startedAt = Date.now();

// app.use('/api', routes);
/* app.use((req, res) => {
    res.status(httpStatus)
}) */

app.use(cors({
  origin: 'https://pwa-exemplo.vercel.app'
}));

app.get('/status', async (req, res) => res.json ({
    uptime: Date.now() - startedAt 
}));

app.get('/product_consult', async (req, res) => {
    console.log('Consultar produto: ', req.query.barcode);
    const { barcode } = req.query;

    if (!barcode) {
        return res.status(400).json({ error: 'Código de barras obrigatorio' });
    }

    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://api.cosmos.bluesoft.com.br/gtins/'+barcode,
        headers: { 
            'X-Cosmos-Token': 'n0YI5YvntVXUjSuPeO2Hug'
        }
    };

    const responseProduct = await axios.request(config)
        .then((response) => {

            const query = 'SELECT * FROM product where bar_code = ?';
            const insert = "INSERT INTO product (bar_code, name, url_image, commercial_unit_type_packaging, commercial_unit_quantity_packaging, barcode_image, brand_name, category_description, hash, dt_create, id_category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            const barCode = response.data.gtin;
            const name = response.data.description;
            const url_image = response.data.thumbnail;
            const gtins = response.data.gtins.find(item => item.gtin === Number(barcode));

            // console.log(response.data.gtins, typeof barcode, typeof response.data.gtins[0].gtin);
            // console.log(gtins.commercial_unit.type_packaging);
            // return false
            
            const commercial_unit_type_packaging = (gtins && gtins.commercial_unit) ? gtins.commercial_unit.type_packaging : null;
            const commercial_unit_quantity_packaging = (gtins && gtins.commercial_unit) ? gtins.commercial_unit.quantity_packaging : null;
            const barcode_image = response.data.barcode_image;
            const brand_name = response.data.brand.name;
            const category_description = response.data.category? response.data.category.description : '';
            const dtCreate = new Date();
            const dtUpdate = new Date();
            const idCategory = 1;

            const stringHash = `${barCode}|${name}|${url_image}|${commercial_unit_type_packaging}|${commercial_unit_quantity_packaging}|${barcode_image}|${brand_name}|${category_description}`;
            const hash = crypto.createHash('md5').update(stringHash).digest('hex');

            console.log("base", stringHash);
            console.log("hash", hash);

            database.connection.query(query, [barcode], (err, results, fields) => {
                if (err) {
                    console.log('Erro ao consultar', err);
                    return;
                }

                console.log('Resultado da consulta', results);
                console.log(results.length);
                
                if (results.length===0) {
                    database.connection.query(insert, [barCode, name, url_image, commercial_unit_type_packaging, commercial_unit_quantity_packaging, barcode_image, brand_name, category_description, hash, dtCreate, idCategory], (err, results) => {
                        if (err){
                            console.error('Erro ao inserir registro: ', err);
                            return;
                        }

                        console.log('Registro inserido!');
                    })
                } else {
                    if (results[0].hash !== hash) {
                        console.log("hash diferente. Alterar"); 
                        database.connection.query("UPDATE product SET hash = ?, name = ?, url_image = ?, commercial_unit_type_packaging = ?, commercial_unit_quantity_packaging = ?, barcode_image = ?, brand_name = ?, category_description = ?, dt_update = ? WHERE bar_code = ?", [hash, name, url_image, commercial_unit_type_packaging, commercial_unit_quantity_packaging, barcode_image, brand_name, category_description, dtUpdate, barCode], (err, results) => {
                            if (err){
                                console.error('Erro ao alterar registro: ', err);
                                return;
                            }
                            console.log('Registro alterado!');
                        })
                    }
                }
            })

            return res.status(200).json(response.data);
        })
        .catch((error) => {
            if (error.response && error.response.status === 404){
                console.log(`${barcode} não encontrado`);
                console.log(`${error.response.status} ${error.response.statusText} ${error.response.data.message}`);
                return res.status(404).json(error.response.data);
            } else{
                console.log(error);
            }
        
    });

    //getProductByBarCode
    // Verificar se existe no mongo
    // gravar no mongo
    // gravar no banco

    // return res.status(200).json(responseProduct);
    // database.connection.end();
    
})


const server = app.listen(3000, () => {
    console.log("server rodando");
});

