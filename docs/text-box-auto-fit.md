# Text Box Auto Fit

Auto Fit extends the fixed-size Text Box with automatic font fitting. It does not change the behavior of the original `Text` element.

## Properties

| Property | Meaning |
| --- | --- |
| `fontSize` | Configured maximum font size |
| `actSize` | Font size currently selected and rendered by Auto Fit |
| `autoFit` | Enables automatic fitting |
| `fitStep` | Font-size reduction for one fitting attempt |
| `fitTries` | Number of reduction attempts allowed before accepting a line break |
| `actTries` | Attempts already consumed for the current line |
| `lineHeight` | Konva line-height multiplier used for measurement and rendering |

Defaults for a new Text Box are:

    fontSize  = 48
    actSize   = 48
    autoFit   = true
    fitStep   = 1
    fitTries  = 0
    actTries  = 0
    lineHeight = 1.00

`fontSize` is an upper bound. Auto Fit may reduce `actSize`, but does not increase it beyond `fontSize`.

## Step and Tries

When additional text would require a line break, Auto Fit can first try a smaller font.

`fitStep` specifies how much the font is reduced for one attempt. `fitTries` specifies how many such attempts may be made before the line break is accepted.

For example:

    fontSize = 48
    fitStep  = 2
    fitTries = 2

may produce the sequence:

    48 -> 46 -> 44

while `actTries` progresses:

    0 -> 1 -> 2

After an accepted line break, `actTries` is reset. Auto Fit then searches for the largest font, up to `fontSize`, that fits the resulting layout.

With `fitTries = 0`, no additional font-reduction attempt is made solely to avoid a line break.

Changing `fitStep` or `fitTries` immediately triggers a reflow of the existing text.

## Reflow

Normal typing at the end of the text continues from the current `actSize` and `actTries` state.

A structural edit to existing text, such as inserting, deleting, or replacing text away from the end, causes a complete reflow starting from `fontSize`. This avoids retaining an unnecessarily small font after earlier text has been shortened or rearranged.

The fitting state therefore describes the current layout, not an irreversible history of previous edits.

## Line Height

`lineHeight` controls the vertical distance between text lines. It is passed to Konva as its line-height multiplier and is used both when measuring the text for Auto Fit and when rendering it.

The inspector changes Line Height in steps of `0.05` and displays it with two decimal places, for example `0.90`, `1.00`, or `1.25`.

Typical values are:

    0.80  tighter line spacing
    1.00  normal line height
    1.20  wider line spacing

Values below `1.00` are intentionally permitted. `0.00` is also technically permitted and causes lines to occupy effectively the same vertical position; it is useful as a boundary case but is normally not suitable for readable multi-line text.

No artificial upper limit is imposed. Increasing Line Height consumes more vertical space and can therefore cause Auto Fit to select a smaller `actSize` so that all lines remain inside the fixed box.

The remaining space above and below the rendered text block is handled by the Text Box's vertical alignment. Line Height replaces the earlier indirect spacing-distribution approach; there is no separate spacing-balance parameter.

## JSON state

The Auto Fit configuration and current fitting state are stored in the Text Box properties. For example:

```json
{
  "fixedBox": true,
  "fontSize": 48,
  "actSize": 41,
  "autoFit": true,
  "fitStep": 1,
  "fitTries": 2,
  "actTries": 0,
  "lineHeight": 0.90
}
```

`actSize` and `actTries` are persisted together with the configuration so that the current editor state can be represented in the label JSON.

These properties apply to fixed Text Boxes. The original thermoprint `Text` element remains independent of this Auto Fit state.
