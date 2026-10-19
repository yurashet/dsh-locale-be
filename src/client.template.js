window.__ModuleLoader__.load({
	id: "dsh-client-locale-be",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

		const inject = ["locale"];

		/** Belarusian dictionaries, keyed by locale namespace. */
		const DICTIONARIES = __DICTIONARIES__;

		/** Register the Belarusian language pack and its dictionaries. */
		function apply(ctx) {
			ctx.effect(
				() => ctx.locale.addLanguage({ id: "be", label: "Беларуская", fallback: "en" }),
				"be-locale: language",
			);
			ctx.effect(() => {
				const disposers = [];
				for (const [ns, dict] of Object.entries(DICTIONARIES)) {
					disposers.push(ctx.locale.register(ns, "be", dict));
				}
				return () => {
					for (const dispose of disposers) dispose();
				};
			}, "be-locale: dictionaries");
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
