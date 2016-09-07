let fs = require('fs')
let glob = require('glob')
let md = require('markdown-it')()
let yaml = require('js-yaml')
let toSlugCase = require('to-slug-case')
let toPascalCase = require('to-pascal-case')
let moment = require('moment')
let _ = require('lodash')

let blogMarkdownDir = './src/posts/'
let blogVueDir = './src/components/blog/'
let posts = glob.sync(blogMarkdownDir + '*.md')

let staticRouterFile = './src/router/staticRouter.js'
let routerFile = './src/router/index.js'
let blogIndexFile = './src/components/pages/BlogIndex.vue'

function markdownToVueData (files) {
  let posts = []
  for (let i = 0; i < files.length; i++) {
    let post = {title: '', slug: '', author: '', date: '', body: ''}

    let data = fs.readFileSync(files[i], 'utf8')
    let metaData = yaml.load(data.split('---')[1])
    let markdownData = data.split('---')[2]

    // set the post metadata
    post.title = metaData.title
    post.slug = toSlugCase(metaData.title)
    post.author = metaData.author
    post.date = moment(metaData.date).valueOf() // ms since epoch

    post.filename = post.slug + '.vue'
    post.filepath = blogVueDir + post.filename
    post.dateFriendly = moment(post.date, 'x').format('YYYY-MM-DD')

    // set up the vue file
    post.body += '<template>\n'
    post.body += '  <!--THIS FILE IS GENERATED BY `npm run blog` DO NOT EDIT HERE-->\n'
    post.body += '  <div class="header-padding"></div>\n'
    post.body += '  <div class="article-wrapper">\n'
    post.body += `<h1>${post.title}</h1>\n\n`
    post.body += `<div class="subtitle">${post.dateFriendly} by ${post.author}</div>\n\n`
    post.body += md.render(markdownData)
    post.body += '  </div><!--article-wrapper-->\n'
    post.body += '</template>'

    posts.push(post)
  }
  // order posts by newest first
  posts = _.orderBy(posts, ['date'], ['desc'])
  return posts
}

function writeVueBlogPosts (data) {
  for (let i = 0; i < data.length; i++) {
    let file = data[i].filepath
    let content = data[i].body
    fs.writeFileSync(file, content, 'utf8')
    console.log(`✓ ${file}`)
  }
}

function writeVueBlogIndex (data) {
  let body = ''

  body += '<template>\n'
  body += '  <!--THIS FILE IS GENERATED BY `npm run blog` DO NOT EDIT HERE-->\n'
  body += '  <div class="header-padding"></div>\n'
  body += '  <div class="article-wrapper" id="blog-index">\n'
  body += '    <h1>Cosmos Blog</h1>\n'
  for (let i = 0; i < data.length; i++) {
    body += `    <a class="article-link" v-link="{ path: '/blog/${data[i].slug}'}">\n`
    body += `      <h3>${data[i].title}</h3>\n`
    body += '    </a>\n'
    body += `    <p>${data[i].dateFriendly}</p>\n`
  } 
  body += '  </div><!--article-wrapper-->\n'
  body += '</template>'

  fs.writeFileSync(blogIndexFile, body, 'utf8')
  console.log(`✓ ${blogIndexFile}`)
}

function writeBlogRoutes (data) {
  let staticRouter = fs.readFileSync(staticRouterFile, 'utf8')
  let body = '// BLOG ROUTES\n'
  for (let i = 0; i < data.length; i++) {
    let importStr = `import Blog${toPascalCase(data[i].title)}`
    let fromStr = ` from '../components/blog/${(data[i].filename)}'\n`
    body += importStr + fromStr
  }
  body += 'let blogRoutes = {\n'
  for (let i = 0; i < data.length; i++) {
    let routeKey = `  '/blog/${data[i].slug}': `
    let routeValue =  `{ component: Blog${toPascalCase(data[i].title)} }`
    let route = routeKey + routeValue
    if (i != data.length -1) { route += ',' }
    route += '\n'
    body += route
  }
  body += '}\n\n'

  body += staticRouter

  fs.writeFileSync(routerFile, body, 'utf8')
  console.log(`✓ ${routerFile}`)
}

let postData = markdownToVueData(posts)
writeVueBlogPosts(postData)
writeVueBlogIndex(postData)
writeBlogRoutes(postData)
