all: blog tmrec

blog: blog.lua
	@cat r.lua blog.lua > $^.cgi
	@echo "main()" >> $^.cgi
	@chmod 755 $^.cgi
	@mv $^.cgi blog.cgi

tmrec: tmrec.lua
	@cat r.lua tmrec.lua > $^.cgi
	@echo "main()" >> $^.cgi
	@chmod 755 $^.cgi
	@mv $^.cgi tmrec.cgi

ad:
	@termux-fix-shebang *.cgi

