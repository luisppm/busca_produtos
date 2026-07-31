// const puppeteer = require("puppeteer");

async function lerProdutos() {
    console.log('inicios leitura');
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 1000,
    });
    const page = await browser.newPage();
    await page.goto("https://cosmos.bluesoft.com.br/categorias/");
    // await page.waitForNetworkIdle();
    await page.waitForSelector("section > ul > li > a");

    // const categories = document.querySelectorAll("section > ul > li > a");

    const categories = await page.$$("section > ul > li > a");

    console.log(categories.length);
    
    /*
    const result = await page.evaluate(() => {
        const categories = [];
        
        .forEach(category => {
            console.log('teste');
            categories.push(category.title);

        })
         return categories;
    })

    console.log(result);
    */
    
    await browser.close();
    console.log('fim leitura');
}
// #container-principal > section > ul > li:nth-child(1) > a
// .item > a
lerProdutos();





