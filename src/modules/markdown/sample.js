export const SAMPLE = `# Apuntes de Cálculo I

**Tema:** Límites y continuidad
**Fecha:** 21 de septiembre

## Definición de límite

Decimos que $\\lim_{x \\to a} f(x) = L$ si para todo $\\varepsilon > 0$ existe un $\\delta > 0$ tal que:

$$
0 < |x - a| < \\delta \\implies |f(x) - L| < \\varepsilon
$$

> Idea intuitiva: podemos acercar $f(x)$ a $L$ tanto como queramos, acercando $x$ a $a$.

## Propiedades

| Propiedad | Expresión |
|-----------|-----------|
| Suma | $\\lim (f + g) = \\lim f + \\lim g$ |
| Producto | $\\lim (f \\cdot g) = \\lim f \\cdot \\lim g$ |
| Cociente | $\\lim \\frac{f}{g} = \\frac{\\lim f}{\\lim g}$, si $\\lim g \\neq 0$ |

### Para repasar

- [x] Leer el capítulo 2
- [ ] Hacer los ejercicios 1 a 15
- [ ] Preguntar en tutoría por el ejemplo 2.4

## Código de apoyo

\`\`\`python
def f(x):
    return (x**2 - 1) / (x - 1)

for h in [0.1, 0.01, 0.001]:
    print(f(1 + h))  # se acerca a 2
\`\`\`

<!-- pagebreak -->

## Siguiente clase

Continuidad y el teorema del valor intermedio.
`;
