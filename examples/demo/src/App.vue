<script setup>
import { inject } from "vue";
import HelloWorld from "./components/HelloWorld.vue";

const $absmartly = inject("$absmartly");
$absmartly.track("payment", {
	amount: Math.floor(Math.random * 10000),
});
</script>

<template>
	<header>
		<div class="wrapper">
			<treatment name="multiple owners">
				<template #0>
					<HelloWorld msg="You did it! #0" />
				</template>
				<template #1="{ config }">
					<HelloWorld msg="You did it! #1" />
				</template>
				<template #loading> Please wait </template>
			</treatment>
		</div>
	</header>
</template>

<style scoped>
header {
	line-height: 1.5;
}

@media (min-width: 1024px) {
	header {
		display: flex;
		place-items: center;
		padding-right: calc(var(--section-gap) / 2);
	}

	header .wrapper {
		display: flex;
		place-items: flex-start;
		flex-wrap: wrap;
	}
}
</style>
