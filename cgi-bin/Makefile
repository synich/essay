all: blog tmrec

blog: blog.lua
	@cat len blog.lua > $^.cgi
	@echo "main()" >> $^.cgi
	@chmod 755 $^.cgi
	@mv $^.cgi blog.cgi

tmrec: tmrec.lua
	@cat len tmrec.lua > $^.cgi
	@echo "main()" >> $^.cgi
	@chmod 755 $^.cgi
	@mv $^.cgi tmrec.cgi

dif:
	@diff $(v) ../../cgi-bin/$(v)

rel:
	@cat $(v) >../../cgi-bin/$(v)

ad:
	@termux-fix-shebang *.cgi

