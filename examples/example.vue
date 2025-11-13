<template>
  <div class="container">
    <!-- TODO: Add loading state for async data -->
    <div v-if="loading">Loading...</div>
    
    <!-- FIXME: This should use computed property instead of method call -->
    <div v-for="item in getItems()" :key="item.id">
      {{ item.name }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExampleComponent',
  data() {
    return {
      // BUG: This should be initialized with empty array, not null
      items: null,
      loading: false
    }
  },
  methods: {
    // HACK: Temporary solution until API is ready
    getItems() {
      return this.items || [];
    },
    
    // NOTE: This method has O(n) complexity - consider memoization
    async fetchData() {
      this.loading = true;
      try {
        // TODO: Replace with actual API endpoint
        const response = await fetch('/api/items');
        this.items = await response.json();
      } catch (error) {
        // FIXME: Add proper error handling
        console.error(error);
      } finally {
        this.loading = false;
      }
    }
  },
  mounted() {
    // TODO: Add error boundary for component errors
    this.fetchData();
  }
}
</script>

<style scoped>
/* TODO: Add responsive design for mobile devices */
.container {
  padding: 20px;
}

/* FIXME: This color doesn't match the design system */
.container {
  background-color: #f0f0f0;
}
</style>

