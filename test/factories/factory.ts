export default function factory<T>(base: () => T) {
	function implementedFactory(props?: Partial<T>): T;
	function implementedFactory(props: Partial<T>[]): T[];
	function implementedFactory(props?: Partial<T> | Partial<T>[]): T | T[] {
		if (Array.isArray(props)) return props.map((item) => ({ ...base(), ...item }));

		return { ...base(), ...props };
	}

	return implementedFactory;
}
