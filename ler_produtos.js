const puppeteer =  require("puppeteer");

async function lerProdutos() {
    console.log('inicios leitura');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://cosmos.bluesoft.com.br/categorias"); // está verificando se é robo
    await page.waitForNetworkIdle();

    // const categories = document.querySelectorAll("section > ul > li > a");

    const categories = await page.$$("section > ul > .item > a");

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





