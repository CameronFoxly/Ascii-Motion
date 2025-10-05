I'm looking to add a new tool to the tool bar, using the "grid-2x2" icon from lucide.that will be next to the ascii text tool. It should be called the ASCII box tool (r), and it will allow users to draw lines boxes and tables using the ascii box-drawing characters. It will launch a side panel like the gradient panel, the  Users will draw on the canvas, with a box style (single line thin, single line, thick, double line, etc) selected, and the tool will enter a preview mode, like the gradient tool or ascii text tool, where the user can cancel or apply what they've created. The system will automatically choose which box drawing character to add, based on the shape they've drawn on the canvas. The visual indicator of what they've drawn will be a faint purple highlight on the cels drawn on, and the characters will live update based on what the user is drawing, like an automated tile map system.  The ascii box side panel will have preview box showing the active grid style of ascii characters, ie: 

╔═╦═╗
║ ║ ║
╠═╬═╣
║ ║ ║
╚═╩═╝

There should be < and > buttons below and the name ("Double line" in this case ), that users navigate through the various styles. 



And it should have three modes: rectangle drawing mode, and free drawing mode, and erasure mode. These should be choosable with a toggle between the three, in the ascii box drawing side panel while the tool is active. 

Both modes check their surrounding cels to decide what character to draw to make sure everything is connected as intended, but the free draw mode should act just like the pencil tool, including smoothing and shift+click straight line drawing. The rectangle drawing mode should be just like the rectangle drawing mode, but with no filled option.  

When the user hits cancel or the x button to close the side panel, the preview should be cleared and the original canvas data should be restored if covered, and the pencil should become the active tool. Similar pattern to the ascii text tool. And when the user hits apply, the preview data gets committed to the canvas data, and is entered into the history as one event. 

Please review all relevent documentations and code status, and ask any questions needed to clarify intent. Then, I'll want a full implementation plan documented before we begin. 