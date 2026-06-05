/**
 * Vue 应用入口（pp 技能）
 *
 * 导入 UnoCSS 虚拟样式模块
 * 创建 Vue 应用并挂载到 #app
 */
import 'virtual:uno.css'
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
