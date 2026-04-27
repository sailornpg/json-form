<script setup lang="ts">
import type {
  JsonSchema,
  SchemaFormControlOptions,
  SchemaFormEffect,
  SchemaFormExposed,
  SchemaFormFieldResolver,
  SchemaFormValidationResult,
  SchemaFormValidator,
  UISchemaElement,
} from '@json-form/form-kit'
import { SchemaForm } from '@json-form/form-kit'
import { computed, ref } from 'vue'

type DemoFormData = {
  name?: string
  accountType?: 'personal' | 'business'
  company?: string
  country?: 'CN' | 'US'
  province?: string
  city?: string
  role?: 'admin' | 'editor' | 'viewer'
  subscribed?: boolean
}

type DemoOption = {
  label: string
  value: string
}

const provinceOptionsMap: Record<string, DemoOption[]> = {
  CN: [
    { label: 'Zhejiang', value: 'zhejiang' },
    { label: 'Guangdong', value: 'guangdong' },
  ],
  US: [
    { label: 'California', value: 'california' },
    { label: 'New York', value: 'new-york' },
  ],
}

const cityOptionsMap: Record<string, DemoOption[]> = {
  zhejiang: [
    { label: 'Hangzhou', value: 'hangzhou' },
    { label: 'Ningbo', value: 'ningbo' },
  ],
  guangdong: [
    { label: 'Shenzhen', value: 'shenzhen' },
    { label: 'Guangzhou', value: 'guangzhou' },
  ],
  california: [
    { label: 'San Francisco', value: 'san-francisco' },
    { label: 'Los Angeles', value: 'los-angeles' },
  ],
  'new-york': [
    { label: 'New York City', value: 'new-york-city' },
    { label: 'Buffalo', value: 'buffalo' },
  ],
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const loadProvinceOptions = async (country: unknown) => {
  await sleep(700)
  return provinceOptionsMap[String(country)] ?? []
}

const loadCityOptions = async (province: unknown) => {
  await sleep(700)
  return cityOptionsMap[String(province)] ?? []
}

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    accountType: {
      type: 'string',
      enum: ['personal', 'business'],
    },
    company: {
      type: 'string',
    },
    country: {
      type: 'string',
      enum: ['CN', 'US'],
    },
    province: {
      type: 'string',
    },
    city: {
      type: 'string',
    },
    role: {
      type: 'string',
      enum: ['admin', 'editor', 'viewer'],
    },
    subscribed: {
      type: 'boolean',
    },
  },
  required: ['name', 'accountType', 'country', 'role'],
}

const companyControlOptions: SchemaFormControlOptions = {
  runtime: {
    visible: (ctx) => ctx.getValue('accountType') === 'business',
    required: (ctx) => ctx.getValue('accountType') === 'business',
    placeholder: (ctx) =>
      ctx.getValue('accountType') === 'business'
        ? '请输入公司名称'
        : '个人账号无需填写公司名称',
    description: (ctx) =>
      ctx.getValue('accountType') === 'business'
        ? '字段级 runtime：企业账号会显示并要求填写公司名称。'
        : '字段级 runtime：切换为企业账号后显示该字段。',
  },
}

const provinceControlOptions: SchemaFormControlOptions = {
  runtime: {
    placeholder: (ctx) =>
      ctx.getValue('country') ? '异步加载省州选项中...' : '请先选择国家',
  },
  effects: [
    ({ changedPath, clearValue }) => {
      if (changedPath === 'province') {
        clearValue('city')
      }
    },
  ],
}

const uischema: UISchemaElement = {
  type: 'Group',
  label: 'Account Profile',
  elements: [
    {
      type: 'Control',
      label: 'Name',
      scope: '#/properties/name',
    },
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Control',
          label: 'Account Type',
          scope: '#/properties/accountType',
        },
        {
          type: 'Control',
          label: 'Company',
          scope: '#/properties/company',
          options: companyControlOptions,
        },
      ],
    },
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Control',
          label: 'Country',
          scope: '#/properties/country',
        },
        {
          type: 'Control',
          label: 'Province / State',
          scope: '#/properties/province',
          options: provinceControlOptions,
        },
      ],
    },
    {
      type: 'Control',
      label: 'City',
      scope: '#/properties/city',
    },
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Control',
          label: 'Role',
          scope: '#/properties/role',
        },
        {
          type: 'Control',
          label: 'Subscribed',
          scope: '#/properties/subscribed',
        },
      ],
    },
  ],
}

const formData = ref<DemoFormData>({
  name: 'Ada Lovelace',
  accountType: 'personal',
  country: 'CN',
  role: 'editor',
  subscribed: true,
})

const formRef = ref<SchemaFormExposed>()
const lastValidation = ref<SchemaFormValidationResult | null>(null)
const submitMessage = ref('点击提交以验证动态联动、effects 与异步下拉。')

const validators: SchemaFormValidator[] = [
  ({ data }) => {
    if (Array.isArray(data)) {
      return []
    }

    const errors = []

    if (data.accountType === 'business' && !data.company) {
      errors.push({
        path: 'company',
        message: '企业账号必须填写公司名称。',
        source: 'custom' as const,
      })
    }

    if (data.subscribed === true && data.role === 'viewer') {
      errors.push({
        path: 'role',
        message: '已订阅用户不能选择 viewer 角色。',
        source: 'custom' as const,
      })
    }

    return errors
  },
]

const fieldResolvers: SchemaFormFieldResolver[] = [
  ({ path, context }) => {
    if (path === 'province') {
      return {
        disabled: !context.getValue('country'),
        description: context.getValue('country')
          ? '全局 resolver：省州选项会根据国家异步加载。'
          : '全局 resolver：选择国家后加载省州选项。',
        options: async (ctx) => loadProvinceOptions(ctx.getValue('country')),
      }
    }
    if (path === 'city') {
      return {
        visible: Boolean(context.getValue('country')),
        disabled: !context.getValue('province'),
        placeholder: context.getValue('province')
          ? '请选择城市'
          : '请先选择省州',
        description: context.getValue('province')
          ? '全局 resolver：城市选项会根据省州异步加载。'
          : '全局 resolver：选择省州后加载城市选项。',
        options: async (ctx) => loadCityOptions(ctx.getValue('province')),
      }
    }

    return undefined
  },
]

const effects: SchemaFormEffect[] = [
  ({ changedPath, clearValue }) => {
    if (changedPath === 'country') {
      clearValue('province')
      clearValue('city')
    }
  },
]

const errorSummary = computed(() => lastValidation.value?.errors ?? [])

const handleDataChange = (nextData: Record<string, unknown> | unknown[]) => {
  if (!Array.isArray(nextData)) {
    formData.value = nextData as DemoFormData
  }
}

const handleChange = (result: SchemaFormValidationResult) => {
  lastValidation.value = result
}

const handleSubmit = (result: SchemaFormValidationResult) => {
  lastValidation.value = result
  submitMessage.value = `提交成功，当前错误数为 ${result.errors.length}。`
}

const handleInvalid = (result: SchemaFormValidationResult) => {
  lastValidation.value = result
  submitMessage.value = `提交已阻止，当前共有 ${result.errors.length} 个错误。`
}

const submitForm = async () => {
  await formRef.value?.submit({
    onSubmit: handleSubmit,
    onInvalid: handleInvalid,
  })
}

const resetValidation = () => {
  formRef.value?.resetValidation()
  submitMessage.value = '已重置校验展示状态。'
}
</script>

<template>
  <div class="demo-shell">
    <section class="hero-panel">
      <p class="eyebrow">Phase 2 MVP</p>
      <h1>SchemaForm with runtime context, effects, and async options</h1>
      <p class="hero-copy">
        当前示例覆盖字段级 runtime、全局 fieldResolvers、全局/字段级 effects，以及异步下拉。
      </p>
    </section>

    <main class="demo-grid">
      <section class="panel">
        <div class="panel-header">
          <h2>Form Preview</h2>
          <p>切换账号类型、国家与省州，观察动态字段和异步选项变化。</p>
        </div>

        <SchemaForm
          ref="formRef"
          :data="formData"
          :schema="schema"
          :uischema="uischema"
          :validators="validators"
          :field-resolvers="fieldResolvers"
          :effects="effects"
          @update:data="handleDataChange"
          @change="handleChange"
          @submit="handleSubmit"
          @invalid="handleInvalid"
        />

        <div class="panel-actions">
          <button class="primary-action" type="button" @click="submitForm">提交表单</button>
          <button class="secondary-action" type="button" @click="resetValidation">重置校验态</button>
        </div>

        <p class="status-copy">{{ submitMessage }}</p>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>Validation State</h2>
          <p>查看聚合后的 <code>valid/errors</code>，以及联动后的最终数据。</p>
        </div>

        <div class="validation-card" :class="{ 'validation-card--invalid': errorSummary.length > 0 }">
          <strong>{{ lastValidation?.valid === false ? '当前表单无效' : '当前表单有效' }}</strong>
          <span>错误数：{{ errorSummary.length }}</span>
        </div>

        <ul v-if="errorSummary.length > 0" class="error-list">
          <li v-for="error in errorSummary" :key="`${error.source}-${error.path}-${error.message}`">
            <code>{{ error.path || '(root)' }}</code> {{ error.message }}
          </li>
        </ul>

        <pre class="json-preview">{{ JSON.stringify(formData, null, 2) }}</pre>
      </section>
    </main>
  </div>
</template>
