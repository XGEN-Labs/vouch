import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import DataBoard from './views/DataBoard.jsx'
import '@fontsource-variable/kalnia'
import './styles.css'

createRoot(document.getElementById('root')).render(location.pathname.startsWith('/admin') ? <DataBoard /> : <App />)
