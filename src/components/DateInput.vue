<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, default: null },
  hasError: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

function handleInput(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <input
    type="date"
    :id="id"
    :value="modelValue"
    class="form-input"
    :class="{ 'has-error': hasError }"
    placeholder="DD/MM/YYYY"
    @input="handleInput"
  />
</template>
