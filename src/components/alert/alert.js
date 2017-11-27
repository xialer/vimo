import Backdrop from '../backdrop'
import Button from '../button'
import popupExtend from '../../util/popup-extend'

export default {
  name: 'Alert',
  extends: popupExtend,
  components: {
    'vm-backdrop': Backdrop,
    'vm-button': Button
  },
  props: {
    image: String,
    title: String,
    subTitle: String,
    cssClass: String,
    message: String,
    // Array button数组，包含全部role
    buttons: {
      type: Array,
      default () { return [] }
    },
    // 如果alert中有input等form
    // input类型 -> text/tel/number/email ....
    // type/name/placeholder/value
    // input类型 ->  checkbox/radio
    // type/value/label/checked/disabled
    inputs: {
      type: Array,
      default () { return [] }
    },
    // Boolean 允许点击backdrop关闭actionsheet
    enableBackdropDismiss: {
      type: Boolean,
      default () { return true }
    },
    mode: {
      type: String,
      default () { return this.$config && this.$config.get('mode', 'ios') || 'ios' }
    }
  },
  data () {
    return {
      /**
       * Alert State
       * @private
       * */
      inputsForDispaly: [],   // inputs数据再加工
      inputType: null,        // Alert中含有的input类型，radio、checkbox
      isAlertTop: false      // 是否将alert放到顶部，用于input输入时显示虚拟键盘
    }
  },
  computed: {
    // 设置Alert的风格
    modeClass () {
      return `alert-${this.mode}`
    },
    buttonsForDisplay () {
      // 如果是string则转化为对象
      return this.buttons.map(button => {
        if (typeof button === 'string') {
          return {text: button}
        }
        return button
      })
    }
  },
  methods: {
    /**
     * @function bdClick
     * @description
     * 点击backdrop,关闭actionsheet，
     * 如存在cancel按钮，点击按钮关闭actionsheet
     * @private
     * */
    bdClick () {
      if (this.enabled && this.enableBackdropDismiss && this.buttonsForDisplay.length > 0) {
        let cancelBtn = this.buttonsForDisplay.find(b => b.role === 'cancel')
        if (cancelBtn) {
          this.btnClick(cancelBtn)
        } else {
          this.dismiss()
        }
      }
    },

    /**
     * @function btnClick
     * @description
     * 点击下方的按钮
     * @param {object} button  - button数组，包含全部role
     * @private
     * */
    btnClick (button) {
      if (!this.enabled) {
        return
      }

      let shouldDismiss = true

      if (button.handler) {
        // a handler has been provided, execute it
        // pass the handler the values from the inputs
        if (button.handler(this.getValues()) === false) {
          // if the return value of the handler is false then do not dismiss
          shouldDismiss = false
        }
      }

      if (shouldDismiss) {
        this.dismiss()
      }
    },

    /**
     * @function rbClick
     * @description
     * Radio Button Click
     * @param {object} checkedInput  - Radio 选中项
     * @private
     * */
    rbClick (checkedInput) {
      if (this.enabled) {
        this.inputsForDispaly.forEach(input => {
          input.checked = (checkedInput === input)
        })
        if (checkedInput.handler) {
          checkedInput.handler(checkedInput)
        }
      }
    },

    /**
     * @function cbClick
     * @description
     * CheckBox Button Click
     * @param {object} checkedInput  - CheckBox 选中项
     * @private
     * */
    cbClick (checkedInput) {
      if (this.enabled) {
        checkedInput.checked = !checkedInput.checked
        if (checkedInput.handler) {
          // 简单的对象拷贝
          checkedInput.handler(JSON.parse(JSON.stringify(checkedInput)))
        }
      }
    },

    /**
     * 获取inputs中的信息
     * @private
     * */
    getValues () {
      if (this.inputType === 'radio' && this.inputsForDispaly.length > 0) {
        // this is an alert with radio buttons (single value select)
        // return the one value which is checked, otherwise undefined
        const checkedInput = this.inputsForDispaly.find(i => i.checked)
        return checkedInput ? checkedInput.value : undefined
      }

      if (this.inputType === 'checkbox' && this.inputsForDispaly.length > 0) {
        // this is an alert with checkboxes (multiple value select)
        // return an array of all the checked values
        return this.inputsForDispaly.filter(i => i.checked).map(i => i.value.toString().trim())
      }

      // this is an alert with text inputs
      // return an object of all the values with the input name as the key
      // input因为不能使用v-model，故通过id获取里面的信息
      const values = {}
      this.inputsForDispaly.forEach(i => {
        let _$id = this.$refs[i.id][0]
        if (_$id && _$id.value) {
          values[i.name] = _$id.value.toString().trim()
        } else {
          values[i.name] = null
        }
      })
      return values
    },

    /**
     * ActionSheet启动之前去除focus效果，因为存在键盘
     * @private
     * */
    focusOutActiveElement () {
      const activeElement = document.activeElement
      activeElement && activeElement.blur && activeElement.blur()
    },

    /**
     * inputs数组初始化组件
     * @private
     * */
    init () {
      if (!this.inputs || this.inputs.length === 0) {
        return []
      }
      // 传入数据处理
      let _inputs = []
      _inputs = this.inputs.map((input, index) => {
        return {
          type: input.type || 'text',
          name: (input.name) ? input.name : index,
          placeholder: (input.placeholder) ? input.placeholder : '',
          value: (input.value) ? input.value : '',
          label: input.label,
          checked: input.checked,
          disabled: input.disabled,
          id: `alert-input-${index}`, // used for input -> text/tel/number/password
          handler: (input.handler) ? input.handler : null
        }
      })

      let inputTypes = []
      _inputs.forEach(input => {
        if (inputTypes.indexOf(input.type) < 0) {
          inputTypes.push(input.type)
        }
      })
      if (inputTypes.length > 1 && (inputTypes.indexOf('checkbox') > -1 || inputTypes.indexOf('radio') > -1)) {
        console.warn(`Alert cannot mix input types: ${(inputTypes.join('/'))}. Please see alert docs for more info.`)
        console.warn(`Alert 组件不能包含复合的input类型: ${(inputTypes.join('/'))}. 请再次阅读说明文档.`)
      }

      this.inputType = inputTypes.length ? inputTypes[0] : null

      // const checkedInput = _inputs.find(input => input.checked)

      const NON_TEXT_INPUT_REGEX = /^(radio|checkbox|range|file|submit|reset|color|image|button)$/i

      const hasTextInput = (_inputs.length && _inputs.some(i => !(NON_TEXT_INPUT_REGEX.test(i.type))))
      // if (hasTextInput && this._platform.is('mobile')) {
      if (hasTextInput) {
        // this alert has a text input and it's on a mobile device so we should align
        // the alert up high because we need to leave space for the virtual keboard
        // this also helps prevent the layout getting all messed up from
        // the browser trying to scroll the input into a safe area
        this.isAlertTop = true
      }

      this.inputsForDispaly = _inputs
    }
  },
  created () {
    this.init()
  }
}
