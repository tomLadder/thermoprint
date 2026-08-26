# Fixed Text Box

The fixed Text Box is an additional editor element. The existing `Text` element keeps its original behavior and is not changed by this feature.

A fixed Text Box is stored as a text element with:

    props.fixedBox = true

Unlike the original text element, its `width` and `height` are independent of the text content. Editing the text therefore does not resize the box.

## Alignment

Horizontal alignment:

- left
- center
- right

Vertical alignment:

- top
- middle
- bottom

New Text Boxes are centered horizontally and vertically.

## Margin

The box can be positioned relative to the complete label. The inspector provides editable horizontal and vertical values:

    Hor [4]   Vert [4]

The preset buttons are:

    0:0   4:4   8:4

The notation is `horizontal:vertical`, measured in pixels. The default for a newly created Text Box is `4:4`.

Applying a margin sets:

    x      = horizontal margin
    y      = vertical margin
    width  = label width  - 2 * horizontal margin
    height = label height - 2 * vertical margin

Afterwards the box remains freely resizable. The margin controls are presets/actions, not a permanent constraint.
