import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { MdButton, MdApp, MdList, MdToolbar, MdDrawer, MdContent } from 'vue-material/dist/components'
import 'vue-material/dist/vue-material.min.css'
import 'vue-material/dist/theme/default.css'

Vue.config.productionTip = false
Vue.use(MdButton)
Vue.use(MdApp)
Vue.use(MdList)
Vue.use(MdToolbar)
Vue.use(MdDrawer)
Vue.use(MdContent)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
