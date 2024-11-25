import { initHeader } from './components/header/header.js'
import { initFooter } from './components/footer/footer.js'
import { initPopupWidget } from './components/header/popup-widget.js'
import { initProducts } from './components/product.js'
import { initDetail } from './components/detail/detail.js'
import { initCategory } from './components/category/category.js'
import { initHomepage } from './components/homepage/homepage.js'
import { initCart } from './components/cart/cart.js'
import { initPages } from './components/pages.js'
import { initBlogListing } from './components/blog/blog-listing.js'
import { initBlogPost } from './components/blog/blog-detail.js'

$(document).ready(function () {
    const body = $('body')
    body.addClass('able-template-1')

    initHeader()
    initFooter()
    initPopupWidget()
    initProducts()

    if (body.hasClass('type-index')) {
        initHomepage()
    }
    if (body.hasClass('type-detail')) {
        initDetail()
    }

    if (body.hasClass('type-category')) {
        initCategory()
    }

    if (body.hasClass('ordering-process')) {
        initCart()
    }

    if (body.hasClass('type-page')) {
        initPages()
    }

    if (body.hasClass('type-posts-listing')) {
        initBlogListing()
    }

    if (body.hasClass('type-post')) {
        initBlogPost()
    }

    body.addClass('ready')
    console.log('RN JS loaded!')
})
