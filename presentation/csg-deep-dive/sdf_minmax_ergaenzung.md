# SDFs: Warum genau min und max?

## 1. Der wichtigste Punkt

Ein Signed Distance Field `d(p)` sagt fuer jeden Punkt `p`, ob er innen, auf der Oberflaeche oder aussen liegt.

| SDF-Wert | Bedeutung |
| --- | --- |
| `d(p) < 0` | Punkt liegt innen |
| `d(p) = 0` | Punkt liegt auf der Oberflaeche |
| `d(p) > 0` | Punkt liegt aussen |

Das Objekt ist also nicht nur die Linie `d(p) = 0`, sondern der ganze negative Bereich:

```text
Objekt = { p | d(p) <= 0 }
```

Genau deshalb funktionieren `min` und `max`: Sie kombinieren die negativen Bereiche der SDFs.

Seien:

```text
a = SDF-Wert von Objekt A am Punkt p
b = SDF-Wert von Objekt B am Punkt p
```

Dann gilt:

```text
p liegt in A  <=>  a <= 0
p liegt in B  <=>  b <= 0
```

## 2. Union: Warum `min(a, b)`?

Bei einer Union soll ein Punkt zur neuen Form gehoeren, wenn er in A oder in B liegt.

```text
p in A vereinigt mit B
<=> p in A oder p in B
<=> a <= 0 oder b <= 0
```

Jetzt schaut man sich an, wann `min(a, b)` negativ wird.

```text
min(a, b) <= 0
```

Das ist genau dann wahr, wenn mindestens einer der beiden Werte negativ oder null ist.

```text
min(a, b) <= 0
<=> a <= 0 oder b <= 0
```

Und das ist exakt die Bedingung fuer die Union.

### Vorzeichen-Tabelle fuer Union

| `a` | `b` | Lage des Punktes | `min(a,b)` | Ergebnis |
| ---: | ---: | --- | ---: | --- |
| negativ | positiv | in A, nicht in B | negativ | drin |
| positiv | negativ | nicht in A, in B | negativ | drin |
| negativ | negativ | in A und B | negativ | drin |
| positiv | positiv | in keinem | positiv | draussen |

Also: Sobald ein Objekt sagt "innen", wird das Minimum negativ. Damit gehoert der Punkt zur Union.

### Intuition

`min(a,b)` nimmt den kleineren SDF-Wert. Der kleinere Wert ist der Wert, der staerker nach "innen" zeigt.

Bei einer Union reicht es, wenn irgendein Objekt den Punkt einschliesst. Deshalb nimmt man den Wert, der am ehesten innen ist.

```text
Union = ODER-Bedingung = min
```

## 3. Schnittmenge: Warum `max(a, b)`?

Bei einer Schnittmenge soll ein Punkt nur dann zur neuen Form gehoeren, wenn er in A und in B liegt.

```text
p in A geschnitten mit B
<=> p in A und p in B
<=> a <= 0 und b <= 0
```

Jetzt schaut man sich an, wann `max(a, b)` negativ wird.

```text
max(a, b) <= 0
```

Das ist nur dann wahr, wenn beide Werte negativ oder null sind.

Warum? Weil das Maximum der groessere, also der strengere Wert ist. Wenn auch nur einer der beiden Werte positiv ist, dann ist auch das Maximum positiv.

```text
max(a, b) <= 0
<=> a <= 0 und b <= 0
```

Und das ist exakt die Bedingung fuer die Schnittmenge.

### Vorzeichen-Tabelle fuer die Schnittmenge

| `a` | `b` | Lage des Punktes | `max(a,b)` | Ergebnis |
| ---: | ---: | --- | ---: | --- |
| negativ | positiv | nur in A | positiv | draussen |
| positiv | negativ | nur in B | positiv | draussen |
| negativ | negativ | in A und B | negativ | drin |
| positiv | positiv | in keinem | positiv | draussen |

Also: Sobald ein Objekt sagt "draussen", wird das Maximum positiv. Damit faellt der Punkt aus der Schnittmenge heraus.

### Intuition

`max(a,b)` nimmt den problematischeren Wert. Fuer die Schnittmenge muss der Punkt alle Bedingungen erfuellen.

Wenn A sagt "innen", aber B sagt "draussen", dann ist der Punkt fuer die Schnittmenge draussen. Genau das macht `max`.

```text
Schnittmenge = UND-Bedingung = max
```

## 4. Differenz: Warum `max(a, -b)`?

Bei `A - B` soll ein Punkt in A liegen, aber nicht in B.

```text
p in A - B
<=> p in A und p nicht in B
<=> a <= 0 und b >= 0
```

Das passt noch nicht direkt zur SDF-Logik, weil SDFs "innen" immer als negativ darstellen.

Also drehen wir B um:

```text
b wird zu -b
```

Dadurch passiert:

```text
b < 0   -> Punkt war in B      -> -b > 0   -> jetzt draussen
b > 0   -> Punkt war ausserhalb B -> -b < 0 -> jetzt innen
```

`-b` ist also das Komplement von B.

Dann ist:

```text
A - B = A geschnitten mit nicht(B)
```

Und eine Schnittmenge wird mit `max` gebildet:

```text
A - B = max(a, -b)
```

### Vorzeichen-Tabelle fuer die Differenz

| `a` | `b` | Lage des Punktes | `-b` | `max(a,-b)` | Ergebnis |
| ---: | ---: | --- | ---: | ---: | --- |
| negativ | negativ | in A und in B | positiv | positiv | entfernt |
| negativ | positiv | in A, nicht in B | negativ | negativ | bleibt |
| positiv | negativ | nicht in A, in B | positiv | positiv | draussen |
| positiv | positiv | nicht in A, nicht in B | negativ | positiv | draussen |

Nur der Fall "in A, aber nicht in B" bleibt negativ. Genau das ist die Differenz.

## 5. Merkhilfe

| Logik | SDF-Operation | Grund |
| --- | --- | --- |
| ODER | `min` | Ein negativer Wert reicht |
| UND | `max` | Alle Werte muessen negativ sein |
| NICHT | Vorzeichenwechsel | Innen und aussen werden vertauscht |

Daraus folgen direkt:

```text
Union:        min(a, b)
Schnittmenge: max(a, b)
Differenz:    max(a, -b)
```

## 6. Akademisch formuliert

Die Oberflaeche eines SDFs ist die Nullmenge. Das Innere eines Objekts ist der Bereich mit `d(p) <= 0`. Boolesche Operationen lassen sich deshalb ueber logische Bedingungen auf diesen negativen Bereichen formulieren. `min` entspricht der Oder-Verknuepfung der Innenbereiche, `max` entspricht der Und-Verknuepfung, und ein Vorzeichenwechsel erzeugt das Komplement.

Wichtig als Detail: Diese Kombinationen liefern die korrekte Nullmenge und die korrekte Innen-Aussen-Struktur. An den Uebergaengen ist das Ergebnis aber nicht immer wieder ein perfektes euklidisches Distanzfeld, weil `min` und `max` Knicke erzeugen koennen.

## 7. Kurzer Sprechtext

Der Trick ist, dass ein SDF ein Objekt ueber sein Vorzeichen beschreibt. Innen bedeutet negativ. Fuer eine Union muss ein Punkt innen sein, sobald A oder B negativ ist. Genau das leistet `min`, weil das Minimum schon negativ wird, wenn einer der beiden Werte negativ ist. Fuer eine Schnittmenge muessen beide Werte negativ sein. Genau das leistet `max`, weil das Maximum nur dann negativ bleibt, wenn beide Werte negativ sind. Fuer eine Differenz dreht man B durch `-b` um und bildet dann wieder eine Schnittmenge: `max(a, -b)`.
