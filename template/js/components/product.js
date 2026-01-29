export const transformProducts = () => {
    const products = $('.products-block .product')

    if (products.length) {
        products.each(function () {
            const product = $(this)
        })
    }
}

export function initProducts() {
    transformProducts()

    document.addEventListener('ShoptetDOMPageContentLoaded', function () {
        transformProducts()
    })
    document.addEventListener('ShoptetDOMPageMoreProductsLoaded', function () {
        transformProducts()
    })
    document.addEventListener('ShoptetDOMAdvancedOrderLoaded', function () {
        transformProducts()
    })
}
