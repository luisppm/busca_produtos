const puppeteer = require('puppeteer');

async function productWeb (req, res){
    console.log('procutweb init');

    const dados = [];

    const url = "https://superboaopcao.loji.com.br/";

    const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
        headless: true,
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);
    await page.goto(url);

    /*
    const detalhesArray = await page.$$('.nav-item.item1', (opts) => 
        console.log(opts)
    ); */

    // const product = document.querySelectorAll(".nav-item.item1");

/*
    await page.evaluate(() => {
        const nodeList = document.querySelectorAll("nav-item item1");
        const teste = [...nodeList];
        
        console.log(teste);
    });
    */

    const listItems = await page.$$('.nav-item.item1');
    
    for(const listItem of listItems) {
        const text = await page.evaluate(element => element.textContent, listItem); // innerText
        console.log('-----');
        console.log(text);
        console.log('-----');
    }

    await browser.close();

    // console.log(detalhesArray);
    // console.log(opts);
    // console.log(product);


    /*
    await detalhesArray.map((product) => {
        const oProduct = product
        dados.push(oProduct);
    }); */

    // console.log(dados);


    console.log('procutweb end');

    
}

module.exports = productWeb;