<script setup lang="ts">
import type { ChartConfiguration } from 'chart.js'
import { BarController, BarElement, CategoryScale, Chart, LinearScale } from 'chart.js'
import { onMounted, ref, shallowRef, useTemplateRef } from 'vue'
import Draw from './components/Draw.vue'

type Symbol = 'dot' | 'dash' | 'empty'

Chart.register(CategoryScale, LinearScale, BarController, BarElement)

const speed = ref(1)
const option: ChartConfiguration = {
  type: 'bar',
  options: {
    scales: {
      y: {
        beginAtZero: true,
        max: 1.3,
        ticks: {
          stepSize: 1,
        },
      },
    },
    animation: {
      duration: 0,
    },

    maintainAspectRatio: false,
  },
  data: {
    labels: [],
    datasets: [
      {
        label: 'Dot',
        data: [],
        borderColor: 'rgb(103,65,217)',
        borderWidth: 5,
      },
      {
        label: 'Dash',
        data: [],
        borderColor: 'rgb(105,219,124)',
        borderWidth: 5,
      },
      {
        label: 'Check',
        data: [],
        borderColor: 'rgb(224,49,49)',
        borderWidth: 5,
      },
    ],
  },
}
const canvas = useTemplateRef('canvas')
const chart = shallowRef<Chart>()
const time = ref(0)
const symbol = ref<Symbol>('empty')
const isSending = ref(false)
const endEl = useTemplateRef('endEl')

const input = ref('Hello')
const output = ref('')
const inputLogs = ref<string[]>([])
const outputLogs = ref<string[]>([])

let controller = new AbortController()
const timeouts: number[] = []

onMounted(() => {
  if (!canvas.value)
    return

  chart.value = new Chart(canvas.value, option)
})

const widthStyle = ref('')

function getValue() {
  return 0.95 + Math.random() * 0.1
}

async function send(s: Symbol) {
  if (!chart.value)
    return

  symbol.value = s
  const totalDuration = s === 'dash' ? 3000 / speed.value : 1000 / speed.value
  const iterations = s === 'dash' ? 30 : 10
  const interval = totalDuration / iterations

  const dotData = chart.value!.config.data.datasets[0].data
  const dashData = chart.value!.config.data.datasets[1].data
  const checkData = chart.value!.config.data.datasets[2].data

  const promises = Array.from({ length: iterations }, (_, i) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (controller.signal.aborted) {
          reject(new Error('Canceled'))
          return
        }
        time.value++

        chart.value!.config.data.labels?.push('')
        checkData.push(time.value % 10 === 0 ? 1 : 0)

        if (time.value % 10 === 0) {
          widthStyle.value = `calc(${1600 + time.value * 10}px)`
        }

        if (time.value % 50 === 0) {
          endEl.value?.scrollIntoView({ behavior: speed.value > 1 ? 'instant' : 'smooth' })
        }

        switch (s) {
          case 'dot':{
            dotData.push(getValue())
            dashData.push(0)
            break
          }
          case 'dash':{
            dashData.push(getValue())
            dotData.push(0)
            break
          }
          case 'empty':{
            dotData.push(0)
            dashData.push(0)
          }
        }

        resolve(undefined)
      }, interval * i)
      timeouts.push(timeout)
    })
  })

  await Promise.all(promises)
  symbol.value = 'empty'
}

const map: Record<string, string> = {
  'A': '.-',
  'B': '-...',
  'C': '-.-.',
  'D': '-..',
  'E': '.',
  'F': '..-.',
  'G': '--.',
  'H': '....',
  'I': '..',
  'J': '.---',
  'K': '-.-',
  'L': '.-..',
  'M': '--',
  'N': '-.',
  'O': '---',
  'P': '.--.',
  'Q': '--.-',
  'R': '.-.',
  'S': '...',
  'T': '-',
  'U': '..-',
  'V': '...-',
  'W': '.--',
  'X': '-..-',
  'Y': '-.--',
  'Z': '--..',
  ' ': '.......',
}

async function sendText() {
  if (!chart.value)
    return

  chart.value.data.labels?.push('')
  chart.value.data.datasets[0].data.push(0)
  chart.value.data.datasets[1].data.push(0)
  chart.value.data.datasets[2].data.push(1)

  isSending.value = true

  let morse = ''

  for (const char of input.value.toUpperCase()) {
    const seq = map[char]
    inputLogs.value.push(`- Sending letter ${char}:`)
    let dotCount = 0
    let dashCount = 0

    for (const c of seq) {
      if (c === '.') {
        inputLogs.value.push(`\tSending DOT`)
        await send('dot')
        dotCount += 2
        if (dashCount) {
          outputLogs.value.push(`- Recieved ${dashCount} DASH signals.`)
          morse += Array.from({ length: dashCount / 4 }, () => '-').join('')
          dashCount = 0
        }
      }
      if (c === '-') {
        inputLogs.value.push(`\tSending DASH.`)
        await send('dash')
        dashCount += 4
        if (dotCount) {
          outputLogs.value.push(`- Recieved ${dotCount} DOT signals.`)
          morse += Array.from({ length: dotCount / 2 }, () => '.').join('')
          dotCount = 0
        }
      }

      await send('empty')
    }

    await send('empty')
    inputLogs.value.push('\n')

    if (dotCount) {
      outputLogs.value.push(`- Recieved ${dotCount} DOT signals.`)
      morse += Array.from({ length: dotCount / 2 }, () => '.').join('')
      dotCount = 0
    }

    if (dashCount) {
      outputLogs.value.push(`- Recieved ${dashCount} DASH signals.`)
      morse += Array.from({ length: dashCount / 4 }, () => '-').join('')
      dashCount = 0
    }

    await send('empty')

    if (morse.length) {
      const result = Object.entries(map).find(([_, v]) => morse === v)

      if (result) {
        output.value += result[0]
        outputLogs.value.push(`\tCurrent morse: ${morse} (${result[0]})`)
      }
      else {
        outputLogs.value.push(`\tCurrent morse: ${morse}.`)
      }

      outputLogs.value.push(`\n`)
      morse = ''
    }
  }

  isSending.value = false
}

function reset() {
  if (!chart.value)
    return

  isSending.value = false
  symbol.value = 'empty'
  controller.abort()
  timeouts.forEach(clearTimeout)

  chart.value.data.labels = []
  chart.value.data.datasets[0].data = []
  chart.value.data.datasets[1].data = []
  chart.value.update()

  inputLogs.value = []
  outputLogs.value = []

  input.value = 'Hello'
  output.value = ''
  speed.value = 1

  controller = new AbortController()
}
</script>

<template>
  <div class="flex items-center flex-col gap-10 h-screen max-w-[1600px] w-full p-10 mx-auto">
    <div class="relative flex justify-center items-center w-full border-2 border-black rounded-md">
      <div class="relative">
        <Draw :symbol="symbol" :is-sending="isSending" />

        <span
          class="absolute top-[7rem] left-[26.5rem] font-bold text-lg"
          :class="symbol === 'dot' ? 'text-white' : 'text-black'"
        >
          DOT
        </span>

        <span class="absolute top-[27rem] left-[27rem] font-bold text-lg">
          DASH
        </span>

        <form class="absolute top-[48.2%] left-[1rem]" @submit.prevent="sendText">
          <label>
            <p class="text-sm text-black/75 italic">Input</p>
            <input
              v-model="input"
              type="text"
              class="bg-transparent w-[10rem] text-xl text-red-500 font-medium outline-none"
            >
          </label>
        </form>

        <div class="absolute top-[47.5%] right-[0.5rem]">
          <p class="text-sm text-black/75 italic">
            Output
          </p>
          <p class="bg-transparent w-[10rem] text-xl text-red-500 font-medium">
            {{ output }}
          </p>
        </div>
      </div>

      <div class="absolute top-4 left-4 flex gap-2">
        <button
          class="px-4 py-2 rounded-md border bg-red-500 text-white"
          @click="reset"
        >
          Reset
        </button>
        <button
          class="px-4 py-2 rounded-md border bg-green-500 text-black"
          @click="sendText"
        >
          Send
        </button>
        <label class="flex flex-col">
          Speed
          <input v-model="speed" type="range" min="1" max="10">
        </label>
      </div>
    </div>

    <div class="border-2 rounded-md border-black size-full w-full max-h-[450px] overflow-x-auto p-4 shrink-0">
      <div class="h-full flex" :style="{ width: widthStyle ?? '1600px' }">
        <canvas ref="canvas" />
        <span ref="endEl" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-10 w-full">
      <div class="p-4 rounded-md border-2 border-black max-h-[400px] overflow-y-scroll">
        <pre class="font-bold">Input logs:</pre>
        <ul>
          <li v-for="(l, i) in inputLogs" :key="i">
            <pre>{{ l }}</pre>
          </li>
        </ul>
      </div>

      <div class="p-4 rounded-md border-2 border-black max-h-[400px] overflow-y-scroll">
        <pre class="font-bold">Output logs:</pre>
        <ul>
          <li v-for="(l, i) in outputLogs" :key="i">
            <pre>{{ l }}</pre>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
