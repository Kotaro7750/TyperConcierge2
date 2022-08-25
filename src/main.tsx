import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './scss/bootstrap-custom.scss';
import 'bootstrap-icons/font/bootstrap-icons.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
