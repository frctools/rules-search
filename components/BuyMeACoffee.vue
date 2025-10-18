<template>
  <a
    class="leading-9 h-[37px] no-underline inline-flex text-gray-50 bg-havelock-blue-600 border text-[23px] tracking-[0.6px] shadow-[0px_1px_2px_rgba(190,190,190,0.5)] box-border transition-[0.3s] duration-[all] ease-linear m-0 px-[9px] py-px rounded-[3px] border-solid border-transparent bmc-button hover:text-gray-100"
    target="_blank"
    href="https://www.buymeacoffee.com/grahamsh"
  >
    <link
      href="https://fonts.googleapis.com/css?family=Cookie"
      rel="stylesheet"
    />
    <img
      src="https://www.buymeacoffee.com/assets/img/BMC-btn-logo.svg"
      alt="Buy GrahamSH a coffee"
      class="w-[27px] shadow-none order-[none] align-middle mb-px"
    />
    <span style="margin-left: 5px">Buy me a hot chocolate</span>
  </a>
</template>

<style scoped>
.bmc-button > span {
  font-family: "Cookie", cursive !important;
}
.bmc-button {
  -webkit-box-shadow: 0px 1px 2px 2px rgba(190, 190, 190, 0.5) !important;
  -webkit-box-sizing: border-box !important;
  -o-transition: 0.3s all linear !important;
  -webkit-transition: 0.3s all linear !important;
  -moz-transition: 0.3s all linear !important;
  -ms-transition: 0.3s all linear !important;
}
.bmc-button:hover,
.bmc-button:active,
.bmc-button:focus {
  @apply no-underline  shadow-[0px_1px_2px_2px_rgba(190,190,190,0.5)] opacity-[0.85];
  -webkit-box-shadow: 0px 1px 2px 2px rgba(190, 190, 190, 0.5) !important;
}
</style>
