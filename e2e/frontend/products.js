module.exports = {
    'Products - user should see the product list': function(client) {
        client
            .url('http://localhost:8081/frontend#/products')
            .waitForElementVisible('body', 1000)
            .elements('class name', 'product-item', function(result) {
                client.expect(result.value.length).to.equal(3);
            });
    },

    'Products - user should see the product details': function(client) {
        client
            .url('http://localhost:8081/frontend#/products/1')
            .waitForElementVisible('.product-details', 2000);

        client.expect.element('.img-thumbnail').to.be.visible;
        client.expect.element('.img-thumbnail').to.have.attribute('src', 'http://lorempixel.com/400/400/');
        client.expect.element('h2').text.to.equal('abc');
        client.expect.element('.description').text.to.equal('John the zoo');
        client.expect.element('.price').text.to.equal('Price: $3.40');
    },
};
