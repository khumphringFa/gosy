// CloudLinux/cPanel Passenger startup entry for GOSY.
// Register "app.cjs" as the Application startup file.
// Start only after dependencies, database, and a successful Next.js production build are ready.
const http = require('node:http')
const next = require('next')

const port = process.env.PORT || 3000
const hostname = '0.0.0.0'
const app = next({ dev: false, hostname, port: Number(port) })
const handle = app.getRequestHandler()

app.prepare()
  .then(() => {
    http.createServer((req, res) => handle(req, res)).listen(port, hostname, () => {
      console.log('GOSY production server started')
    })
  })
  .catch((error) => {
    console.error('GOSY startup failed:', error)
    process.exit(1)
  })
