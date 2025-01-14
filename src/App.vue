<script setup lang="ts">
import type { ChartConfiguration } from 'chart.js'
import { useIntervalFn } from '@vueuse/core'
import { BarController, BarElement, CategoryScale, Chart, Legend, LinearScale } from 'chart.js'
import { onMounted, ref, shallowRef, useTemplateRef } from 'vue'

Chart.register(CategoryScale, LinearScale, BarController, BarElement, Legend)

const option: ChartConfiguration = {
  type: 'bar',
  options: {
    scales: {
      y: {
        beginAtZero: true,
        max: 1.5,
        ticks: {
          stepSize: 1,
        },
      },
    },
  },
  data: {
    labels: [],
    datasets: [
      {
        label: 'Dot',
        data: [],
        borderColor: 'rgba(103,65,217,1)',
        borderWidth: 2,
        fill: false,
      },
      {
        label: 'Dash',
        data: [],
        borderColor: 'rgba(105,219,124,1)',
        borderWidth: 2,
        fill: false,
      },
      {
        label: 'Check',
        data: [],
        borderColor: 'rgba(224,49,49,1)',
        borderWidth: 2,
        fill: false,
      },
    ],
  },
}
const canvas = useTemplateRef('canvas')
const chart = shallowRef<Chart>()
const time = ref(0)
const unit = 100

const text = ref('.--')

onMounted(() => {
  if (!canvas.value)
    return

  chart.value = new Chart(canvas.value, option)
})

const { pause, resume } = useIntervalFn(() => {
  if (!chart.value)
    return

  time.value++
  chart.value.config.data.labels?.push('')
  chart.value.config.data.datasets[0].data?.push(0)
  chart.value.config.data.datasets[1].data?.push(0)
  chart.value.config.data.datasets[2].data?.push(time.value % 10 === 0 ? 1 : 0)
  chart.value.update()
}, unit, { immediate: true, immediateCallback: false })

function getValue() {
  return 0.95 + Math.random() * 0.2
}

async function sendSymbol(dash = false) {
  pause()
  await new Promise((resolve) => {
    if (!chart.value)
      return

    for (let i = 1; i <= 10 * (dash ? 3 : 1); i++) {
      time.value++
      chart.value.config.data.labels?.push('')
      if (dash) {
        chart.value.config.data.datasets[1].data?.push(getValue())
        chart.value.config.data.datasets[0].data?.push(0)
      }
      else {
        chart.value.config.data.datasets[0].data?.push(getValue())
        chart.value.config.data.datasets[1].data?.push(0)
      }
      chart.value.config.data.datasets[2].data?.push(time.value % 10 === 0 ? 1 : 0)
    }

    resolve(undefined)
    chart.value.update()
  })
  resume()
}

async function sendText() {
  if (!chart.value)
    return

  for (const c of text.value) {
    if (c === '.')
      await sendSymbol()
    if (c === '-')
      await sendSymbol(true)
  }
}
</script>

<template>
  <div>
    <canvas ref="canvas" width="1200" height="400" />

    <div class="flex gap-2">
      <button class="px-4 py-2 bg-red-500" @click="sendText">
        text
      </button>
      <button class="px-4 py-2 bg-red-500" @click="sendSymbol(false)">
        dot
      </button>
      <button class="px-4 py-2 bg-red-500" @click="sendSymbol(true)">
        dash
      </button>
      <button class="px-4 py-2 bg-red-500" @click="pause">
        pause
      </button>
    </div>
  </div>
</template>
